import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidatedConfig } from './config.ts';
import { getServiceAccount, getGoogleAuthToken } from './gcpAuth.ts';

// Product search result type
export interface ProductSearchResult {
  id: number;
  brand: string;
  title: string;
  product_url: string;
  image_url: string;
  price_usd: number;
  star_rating: number;
  product_type: string;
  full_ingredients_list: string[];
  key_ingredients: string[];
  target_audience: string;
  potential_concerns: string[];
  summary: string;
  similarity: number;
}

// Search response type
export interface ProductSearchResponse {
  query: string;
  product_count: number;
  products: ProductSearchResult[];
  error?: string;
  fallback_used?: boolean;
}

// Token cache to avoid regenerating on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Gets configuration for Vertex AI endpoints with fallback
 */
export function getVertexAIConfig(): VertexAIConfig {
  const projectId = Deno.env.get('GCP_PROJECT_ID') || 'fallback-project';
  
  return {
    projectId,
    embeddingEndpoint: `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets a valid GCP auth token with automatic refresh
 */
async function getValidAuthToken(): Promise<string> {
  const now = Date.now();
  
  // Check if we have a cached token that's still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiresAt > now + (5 * 60 * 1000)) {
    console.log('🔐 Using cached auth token');
    return cachedToken.token;
  }
  
  console.log('🔄 Generating new auth token...');
  try {
    const serviceAccount = await getServiceAccount();
    const token = await getGoogleAuthToken(serviceAccount);
    
    // Cache the token for 55 minutes (tokens are valid for 1 hour)
    cachedToken = {
      token,
      expiresAt: now + (55 * 60 * 1000)
    };
    
    console.log('✅ New auth token generated and cached');
    return token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates an embedding for a text query using Vertex AI with retry mechanism
 * @param query - The text query to embed
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise<number[]> - The embedding vector
 */
async function generateEmbedding(
  query: string,
  maxRetries: number = 3
): Promise<number[]> {
  const config = getValidatedConfig();
  let lastError: Error | null = null;
  
  // Log the exact GCP project being used for transparency
  console.log(`🏗️ Using GCP Project: ${config.gcpProjectId} (from Supabase secret)`);
  console.log(`🔗 Embedding endpoint: ${config.embeddingModel.endpoint}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Embedding attempt ${attempt}/${maxRetries} for query: "${query.substring(0, 50)}..."`);
      
      // Get a valid auth token (may refresh if expired)
      const authToken = await getValidAuthToken();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      // Use the embedding endpoint from config
      const response = await fetch(config.embeddingModel.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ content: query }],
          parameters: { outputDimensionality: 3072 }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        
        // If it's an auth error, invalidate the cached token and retry
        if (response.status === 401 || response.status === 403) {
          console.warn('🔓 Auth token may be expired, invalidating cache');
          cachedToken = null;
          if (attempt < maxRetries) {
            continue; // Retry with fresh token
          }
        }
        
        throw new Error(`Embedding API ${response.status}: ${errorBody}`);
      }

      const embeddingData = await response.json();
      
      // Handle different response formats
      let embedding: number[] | undefined;
      
      if (embeddingData?.predictions?.[0]?.embeddings?.values) {
        embedding = embeddingData.predictions[0].embeddings.values;
      } else if (embeddingData?.predictions?.[0]?.embeddings) {
        embedding = embeddingData.predictions[0].embeddings;
      } else if (embeddingData?.embeddings?.[0]?.values) {
        embedding = embeddingData.embeddings[0].values;
      }

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Invalid embedding response format: ${JSON.stringify(embeddingData)}`);
      }

      console.log(`✅ Embedding generated successfully (${embedding.length}/3072 dimensions)`);
      return embedding;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown embedding error');
      console.error(`❌ Embedding attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Embedding generation failed after all retries');
}

/**
 * Searches for products in Supabase with retry mechanism
 */
async function searchDatabase(
  supabaseClient: SupabaseClient,
  embedding: number[],
  options: { matchThreshold: number; matchCount: number },
  maxRetries: number = 3
): Promise<ProductSearchResult[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Database search attempt ${attempt}/${maxRetries}`);
      
      const { data: products, error } = await supabaseClient.rpc('match_products', {
        query_embedding: embedding,
        match_threshold: options.matchThreshold,
        match_count: options.matchCount,
      });

      if (error) {
        throw new Error(`Database RPC error: ${error.message}`);
      }

      if (!products || !Array.isArray(products)) {
        throw new Error('Invalid database response format');
      }

      console.log(`✅ Database search successful: ${products.length} products found`);
      return products;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown database error');
      console.error(`❌ Database search attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying database search in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Database search failed after all retries');
}

/**
 * Fallback text search when semantic search fails
 */
async function fallbackTextSearch(
  supabaseClient: SupabaseClient,
  query: string,
  matchCount: number,
  maxRetries: number = 3
): Promise<ProductSearchResult[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Text search attempt ${attempt}/${maxRetries}`);
      
      // Search across multiple fields with ILIKE for partial matches
      const { data: textProducts, error } = await supabaseClient
        .from('products')
        .select('*')
        .or(`title.ilike.%${query}%,brand.ilike.%${query}%,product_type.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(matchCount);
      
      if (error) {
        throw new Error(`Text search error: ${error.message}`);
      }

      if (!textProducts || !Array.isArray(textProducts)) {
        throw new Error('Invalid text search response');
      }

      // Add artificial similarity scores based on relevance
      const productsWithSimilarity = textProducts.map((product: any, index: number) => {
        const lowerQuery = query.toLowerCase();
        const lowerTitle = (product.title || '').toLowerCase();
        const lowerBrand = (product.brand || '').toLowerCase();
        const lowerType = (product.product_type || '').toLowerCase();
        
        let score = 0.5; // Base score for text search
        
        // Boost score based on where the match was found
        if (lowerTitle.includes(lowerQuery)) score += 0.3;
        if (lowerBrand.includes(lowerQuery)) score += 0.2;
        if (lowerType.includes(lowerQuery)) score += 0.2;
        
        // Slight penalty for position in results
        score = Math.max(score - (index * 0.05), 0.3);
        
        return {
          ...product,
          similarity: Math.min(score, 0.85) // Cap at 0.85 for text search
        };
      }) as ProductSearchResult[];

      console.log(`✅ Text search successful: ${productsWithSimilarity.length} products found`);
      return productsWithSimilarity;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown text search error');
      console.error(`❌ Text search attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying text search in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Text search failed after all retries');
}

/**
 * ROBUST product search with 2-step fallback: semantic → text search
 * @param query - The natural language search query
 * @param supabaseClient - The Supabase client instance
 * @param authToken - The GCP authentication token (will be refreshed if needed)
 * @param options - Search options
 * @returns Promise<ProductSearchResponse> - Search results
 */
export async function searchSkincareProducts(
  query: string,
  supabaseClient: SupabaseClient,
  authToken: string, // Keep for backward compatibility but will use cached token
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<ProductSearchResponse> {
  const { matchThreshold = 0.7, matchCount = 5 } = options;
  const startTime = Date.now();
  const config = getValidatedConfig();
  
  console.log(`🔍 ROBUST SEARCH START: "${query}"`);
  console.log(`🔑 GCP Project (from Supabase secret): ${config.gcpProjectId}`);
  console.log(`🌍 GCP Region: ${config.gcpRegion}`);
  
  // Step 1: Try semantic search with embeddings
  try {
    console.log('📊 Attempting semantic search...');
    
    const embedding = await generateEmbedding(query);
    const products = await searchDatabase(supabaseClient, embedding, { matchThreshold, matchCount });
    
    if (products.length > 0) {
      const duration = Date.now() - startTime;
      console.log(`✅ SEMANTIC SEARCH SUCCESS: ${products.length} products in ${duration}ms`);
      console.log(`Top result: ${products[0].title} (Score: ${products[0].similarity})`);
      
      return {
        query,
        product_count: products.length,
        products,
      };
    }
    
    console.log('⚠️ Semantic search returned 0 products, falling back to text search...');
    
  } catch (error) {
    console.error('❌ Semantic search failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('🔄 Falling back to text search...');
  }
  
  // Step 2: Try text search as fallback
  try {
    console.log('🔤 Attempting text-based search...');
    
    const textProducts = await fallbackTextSearch(supabaseClient, query, matchCount);
    
    if (textProducts.length > 0) {
      const duration = Date.now() - startTime;
      console.log(`✅ TEXT SEARCH SUCCESS: ${textProducts.length} products in ${duration}ms`);
      console.log(`Top result: ${textProducts[0].title} (Score: ${textProducts[0].similarity})`);
      
      return {
        query,
        product_count: textProducts.length,
        products: textProducts,
        fallback_used: true,
      };
    }
    
    console.error('❌ Text search also returned 0 products');
    
  } catch (error) {
    console.error('❌ Text search fallback failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Both searches failed - this indicates a serious system issue
  const duration = Date.now() - startTime;
  const errorMessage = `All search methods failed for query: "${query}" in ${duration}ms. This indicates database connectivity issues or empty product catalog.`;
  
  console.error(`🚨 CRITICAL: ${errorMessage}`);
  
  return {
    query,
    product_count: 0,
    products: [],
    fallback_used: true,
  };
}

/**
 * Validates a search query before processing
 * @param query - The search query to validate
 * @throws Error if query is invalid
 */
export function validateSearchQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query must be a non-empty string');
  }

  if (query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  if (query.length > 1000) {
    throw new Error('Search query is too long (maximum 1000 characters)');
  }
} 