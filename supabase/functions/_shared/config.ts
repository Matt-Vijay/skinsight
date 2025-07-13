// Configuration management for Supabase Edge Functions

export interface AIModelConfig {
  name: string;
  endpoint: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}

export interface AppConfig {
  // GCP Configuration
  gcpProjectId: string;
  gcpRegion: string;
  
  // Supabase Configuration
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  
  // AI Model Configuration
  geminiModel: AIModelConfig;
  embeddingModel: {
    name: string;
    endpoint: string;
  };
  
  // Search Configuration
  defaultSearchThreshold: number;
  defaultSearchCount: number;
  maxImagePaths: number;
  
  // Validation limits
  maxPromptLength: number;
  maxQueryLength: number;
}

/**
 * Gets the application configuration from environment variables
 * @throws Error if required environment variables are missing
 */
export function getAppConfig(): AppConfig {
  const gcpProjectId = Deno.env.get('GCP_PROJECT_ID');
  const gcpRegion = Deno.env.get('GCP_REGION') || 'us-central1';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Validate required environment variables
  const missingVars: string[] = [];
  
  if (!gcpProjectId) missingVars.push('GCP_PROJECT_ID');
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please ensure these are set in your Supabase project settings.'
    );
  }

  // Model configuration with environment variable overrides
  const geminiModelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-2.5-pro';
  const embeddingModelName = Deno.env.get('EMBEDDING_MODEL_NAME') || 'gemini-embedding-001';
  
  // Use 'global' for the AI platform endpoint for higher availability
  const aiPlatformLocation = 'global';
  
  return {
    gcpProjectId: gcpProjectId!,
    gcpRegion,
    supabaseUrl: supabaseUrl!,
    supabaseServiceRoleKey: supabaseServiceRoleKey!,
    
    geminiModel: {
      name: geminiModelName,
      endpoint: `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${aiPlatformLocation}/publishers/google/models/${geminiModelName}`,
      temperature: parseFloat(Deno.env.get('GEMINI_TEMPERATURE') || '0.6'),
      topP: parseFloat(Deno.env.get('GEMINI_TOP_P') || '1'),
      topK: parseInt(Deno.env.get('GEMINI_TOP_K') || '32'),
      maxOutputTokens: parseInt(Deno.env.get('GEMINI_MAX_TOKENS') || '8192'),
    },
    
    embeddingModel: {
      name: embeddingModelName,
      endpoint: `https://${gcpRegion}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpRegion}/publishers/google/models/${embeddingModelName}:predict`,
    },
    
    defaultSearchThreshold: parseFloat(Deno.env.get('DEFAULT_SEARCH_THRESHOLD') || '0.7'),
    defaultSearchCount: parseInt(Deno.env.get('DEFAULT_SEARCH_COUNT') || '10'),
    maxImagePaths: parseInt(Deno.env.get('MAX_IMAGE_PATHS') || '10'),
    
    maxPromptLength: parseInt(Deno.env.get('MAX_PROMPT_LENGTH') || '50000'),
    maxQueryLength: parseInt(Deno.env.get('MAX_QUERY_LENGTH') || '1000'),
  };
}

/**
 * Validates the configuration values
 * @param config - The configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: AppConfig): void {
  // Validate numeric ranges
  if (config.geminiModel.temperature < 0 || config.geminiModel.temperature > 2) {
    throw new Error('GEMINI_TEMPERATURE must be between 0 and 2');
  }
  
  if (config.geminiModel.topP < 0 || config.geminiModel.topP > 1) {
    throw new Error('GEMINI_TOP_P must be between 0 and 1');
  }
  
  if (config.geminiModel.topK < 1 || config.geminiModel.topK > 100) {
    throw new Error('GEMINI_TOP_K must be between 1 and 100');
  }
  
  if (config.geminiModel.maxOutputTokens < 1 || config.geminiModel.maxOutputTokens > 32768) {
    throw new Error('GEMINI_MAX_TOKENS must be between 1 and 32768');
  }
  
  if (config.defaultSearchThreshold < 0 || config.defaultSearchThreshold > 1) {
    throw new Error('DEFAULT_SEARCH_THRESHOLD must be between 0 and 1');
  }
  
  if (config.defaultSearchCount < 1 || config.defaultSearchCount > 50) {
    throw new Error('DEFAULT_SEARCH_COUNT must be between 1 and 50');
  }
  
  if (config.maxImagePaths < 1 || config.maxImagePaths > 20) {
    throw new Error('MAX_IMAGE_PATHS must be between 1 and 20');
  }
}

/**
 * Gets validated application configuration
 * This is the main function to use in your edge functions
 */
export function getValidatedConfig(): AppConfig {
  const config = getAppConfig();
  validateConfig(config);
  return config;
} 