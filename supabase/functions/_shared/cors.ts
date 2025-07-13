import { ErrorResponse } from './types.ts';

// Define allowed origins 
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://your-production-domain.com",
];

// Default CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to handle CORS preflight requests
export function handleCors(req: Request): Response | null {
  // Check if this is a preflight request
  if (req.method === "OPTIONS") {
    // Get the requesting origin
    const origin = req.headers.get("Origin") || "*";
    
    // Set the appropriate origin header based on allowed origins
    const accessControlAllowOrigin = ALLOWED_ORIGINS.includes(origin) 
      ? origin 
      : ALLOWED_ORIGINS[0];
    
    // Return the preflight response with CORS headers
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
      },
    });
  }
  
  // Not a preflight request, return null to continue processing
  return null;
}

// Function to add CORS headers to a response
export const addCorsHeaders = (response: Response): Response => {
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  return newResponse;
};

// Function to create a JSON response with CORS headers
export const createCorsResponse = (body: any, status = 200): Response => {
  return addCorsHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

// Function to create an error response with CORS headers
export const createErrorResponse = (
  message: string, 
  status = 400, 
  details?: string
): Response => {
  const errorResponse: ErrorResponse = {
    error: {
      message,
      status,
      ...(details && { details }),
    }
  };
  
  return createCorsResponse(errorResponse, status);
}; 