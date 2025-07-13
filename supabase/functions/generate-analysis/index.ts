// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

// Import shared modules
import { handleCors, createCorsResponse, createErrorResponse } from '../_shared/cors.ts';
import { getValidatedConfig } from '../_shared/config.ts';
import { getServiceAccount, getGoogleAuthToken } from '../_shared/gcpAuth.ts';
import { searchSkincareProducts, validateSearchQuery } from '../_shared/productSearch.ts';
import { 
  validateGenerateAnalysisRequest, 
  validateAnalysisResponse,
  ValidationError,
  type GenerateAnalysisRequest,
  type GenerateAnalysisResponse 
} from '../_shared/validation.ts';
import { 
  createValidatedPrompt, 
  getSkincareSearchTool,
  type PromptVariables 
} from '../_shared/prompts.ts';

console.log('🚀 Initializing `generate-analysis` function...');

// --- Initialize Supabase Client (outside the request handler) ---
let supabaseAdmin: any;
try {
  const config = getValidatedConfig();
  supabaseAdmin = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`
        }
      }
    }
  );
  console.log('✅ Supabase admin client initialized successfully.');
} catch (error: unknown) {
  console.error('❌ CRITICAL: Failed to initialize Supabase client:', (error as Error).message);
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // --- Configuration and Validation ---
    const config = getValidatedConfig();
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    const validatedRequest = validateGenerateAnalysisRequest(requestBody);
    const { anonymous_questionnaire_id, image_paths } = validatedRequest;

    console.log(`--- New Analysis Request [${anonymous_questionnaire_id}] ---`);

    // --- Fetch Questionnaire Data ---
    if (!supabaseAdmin) {
      return createErrorResponse('Server configuration error: Supabase client not available', 500);
    }
    const { data: questionnaireData, error: questionnaireError } = await supabaseAdmin
      .from('anonymous_questionnaires')
      .select('*')
      .eq('id', anonymous_questionnaire_id)
      .single();

    if (questionnaireError) {
      console.error('❌ Questionnaire fetch error:', questionnaireError);
      return createErrorResponse(
        `Failed to fetch questionnaire data: ${questionnaireError.message}`,
        404
      );
    }

    // --- Download and Process Images ---
    const downloadPromises = image_paths.map(async (path: string) => {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('skin-images')
          .download(path);

        if (error) {
          console.error(`❌ Error downloading image ${path}:`, error);
          throw new Error(`Failed to download image ${path}: ${error.message}`);
        }

        const arrayBuffer = await data.arrayBuffer();
        return {
          inlineData: {
            mimeType: data.type,
            data: encodeBase64(arrayBuffer),
          },
        };
      } catch (error) {
        throw new Error(`Image processing failed for ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    const imageParts = await Promise.all(downloadPromises);

    // --- Setup Authentication ---
    const serviceAccount = await getServiceAccount();
    const authToken = await getGoogleAuthToken(serviceAccount);

    // --- Prepare AI Request ---
    const promptVariables: PromptVariables = { questionnaireData };
    const agentPrompt = createValidatedPrompt(promptVariables, config.maxPromptLength);
    
    const tools = [getSkincareSearchTool()];
    const contents = [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: agentPrompt },
        ],
      },
    ];

    // --- Initial AI Call ---
    // Use a faster model for the initial planning step, and the powerful model for synthesis.
    const synthesisModelEndpoint = config.geminiModel.endpoint;
    const planningModelEndpoint = synthesisModelEndpoint.replace('gemini-2.5-pro', 'gemini-2.5-flash');

    let aiResponse = await fetch(`${planningModelEndpoint}:generateContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        tools,
        generationConfig: {
          temperature: config.geminiModel.temperature,
          topP: config.geminiModel.topP,
          topK: config.geminiModel.topK,
          maxOutputTokens: config.geminiModel.maxOutputTokens,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      throw new Error(`Vertex AI API request failed: ${aiResponse.status} ${errorBody}`);
    }

    const result = await aiResponse.json();

    // --- Handle Tool Calling ---
    const candidates = result.candidates?.[0];

    if (candidates?.finishReason && !['STOP', 'TOOL_USE'].includes(candidates.finishReason)) {
      console.warn(`[LOG] AI 1st call finished with unexpected reason: ${candidates.finishReason}`);
    }
    
    const contentParts = candidates?.content?.parts || [];
    
    // Check for function calls
    const functionCallParts = contentParts.filter((part: any) => part.functionCall);
    let combinedText = '';
    
    if (functionCallParts.length > 0) {
      // Execute all function calls in parallel
      const toolPromises = functionCallParts.map(async (part: any) => {
        const call = part.functionCall;
        
        if (call.name === 'skincare_product_search') {
          try {
            validateSearchQuery(call.args.query);
          } catch (error) {
            console.error(`❌ Invalid search query: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { error: `Invalid search query: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }

          return await searchSkincareProducts(
            call.args.query,
            supabaseAdmin,
            authToken,
            {
              matchThreshold: config.defaultSearchThreshold,
              matchCount: config.defaultSearchCount,
            }
          );
        }
        
        return { error: `Unknown function call: ${call.name}` };
      });
      
      const toolResults = await Promise.all(toolPromises);
      
      // Add tool conversation history
      contents.push({
        role: 'model',
        parts: functionCallParts,
      });
      
      const toolResponseParts = functionCallParts.map((part: any, i: number) => {
        const result = toolResults[i];
        // The response for a function call must be a JSON object that matches the function's return type.
        // The previous implementation was incorrectly wrapping and stringifying the response.
        const cleanResponse = { products: result.products || [] }; // Ensure products is always an array.

        return {
          functionResponse: {
            name: part.functionCall.name,
            response: cleanResponse,
          },
        };
      });
      
      contents.push({
        role: 'tool',
        parts: toolResponseParts,
      });

      // --- Follow-up AI Call ---
      const streamEndpoint = `${synthesisModelEndpoint}:streamGenerateContent`;
      aiResponse = await fetch(streamEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.geminiModel.temperature,
            topP: config.geminiModel.topP,
            topK: config.geminiModel.topK,
            maxOutputTokens: config.geminiModel.maxOutputTokens,
            responseMimeType: 'application/json',
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      });

      if (!aiResponse.ok || !aiResponse.body) {
        const errorBody = await aiResponse.text();
        throw new Error(`Vertex AI API stream request failed: ${aiResponse.status} ${errorBody}`);
      }

      // Process the stream
      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
      }
      
      try {
        const jsonResponseArray = JSON.parse(accumulatedResponse.trim());
        combinedText = jsonResponseArray
          .flatMap((obj: any) => obj.candidates?.[0]?.content?.parts)
          .map((part: any) => part.text)
          .join('');
      } catch(e) {
        console.error("Error parsing streamed response:", e);
        console.error("Accumulated data that failed to parse:", accumulatedResponse);
        throw new Error("Failed to parse the streamed response from the AI model.");
      }
    } else {
      console.warn('[LOG] CRITICAL: AI did not request any tool calls. The prompt may be failing.');
    }

    // --- Extract and Sanitize Final Response ---
    // Helper function to extract JSON from a string that might be wrapped in markdown
    function extractJsonFromString(text: string): string {
      if (!text) return '';
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonRegex);
      if (match && match[1]) {
        // If markdown with json is found, return the extracted content
        return match[1].trim();
      }
      // Otherwise, assume the string is raw JSON and trim it
      return text.trim();
    }
    
    let finalData: GenerateAnalysisResponse;
    try {
      const rawResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || combinedText;
      if (!rawResponseText) {
        throw new Error("No final content received from the AI model");
      }
      const sanitizedJsonString = extractJsonFromString(rawResponseText);
      if (!sanitizedJsonString) {
        throw new Error("Sanitized response text is empty");
      }
      const parsedResponse = JSON.parse(sanitizedJsonString);
      finalData = validateAnalysisResponse(parsedResponse);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error('❌ AI response validation failed:', error.message);
        throw new Error(`AI response validation failed: ${error.message}`);
      } else if (error instanceof SyntaxError) {
        console.error('❌ Failed to parse AI response as JSON:', error.message);
        console.error('Raw AI Response:', result.candidates?.[0]?.content?.parts?.[0]?.text);
        const parseError = error instanceof Error ? error.message : 'Unknown parsing error';
        throw new Error(`The AI service returned invalid JSON. Details: ${parseError}`);
      } else {
        throw error;
      }
    }

    // --- Log Success ---
    console.log('✅ Analysis generation completed successfully. Response:', JSON.stringify(finalData, null, 2));
    
    return createCorsResponse(finalData, 200);

  } catch (error) {
    // Enhanced error handling with detailed logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isUserError = error instanceof ValidationError || 
                       errorMessage.includes('validation') ||
                       errorMessage.includes('Invalid');
    
    console.error('❌ Function error:', {
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      isUserError,
    });

    const statusCode = isUserError ? 400 : 500;
    return createErrorResponse(
      `Function Error: ${errorMessage}`,
      statusCode
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-analysis' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"anonymous_questionnaire_id":"550e8400-e29b-41d4-a716-446655440000","image_paths":["test/image1.jpg","test/image2.jpg"]}'

*/
