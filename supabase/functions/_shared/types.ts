// Type definitions for shared use across Supabase Edge Functions

// User profile from questionnaire responses
export interface UserProfile {
  skinType: string;
  skinSensitivity?: boolean;
  concerns: string[];
  age?: number;
  gender?: string;
  sensitiveAreas?: string[];
  restfulSleepFrequency?: string;
  mainDailyExposure?: string;
  postCleanseSkinFeel?: string;
  flareSkinFeel?: string;
  preferredBrands?: string[];
  budget?: 'low' | 'medium' | 'high';
}

// Error response structure
export interface ErrorResponse {
  error: {
    message: string;
    status: number;
    details?: string;
  };
}

export interface APIResponse<T> {
  data: T;
  status: number;
  message: string;
}

// Additional types for enhanced functionality

// GCP and Authentication types
export interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  project_id?: string;
}

// AI Model Configuration
export interface AIModelConfig {
  name: string;
  endpoint: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}

// Configuration types
export interface AppConfig {
  gcpProjectId: string;
  gcpRegion: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiModel: AIModelConfig;
  embeddingModel: {
    name: string;
    endpoint: string;
  };
  defaultSearchThreshold: number;
  defaultSearchCount: number;
  maxImagePaths: number;
  maxPromptLength: number;
  maxQueryLength: number;
}

// Product search types
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

export interface ProductSearchResponse {
  query: string;
  product_count: number;
  products: ProductSearchResult[];
  error?: string;
}

// Validation types
export interface GenerateAnalysisRequest {
  anonymous_questionnaire_id: string;
  image_paths: string[];
}

export interface AnalysisMetrics {
  hydration: number;
  barrier: number;
  hydrationSummary: string;
  barrierSummary: string;
}

export interface SkinAnalysis {
  overallScore: number;
  primaryState: 'Excellent' | 'Good' | 'Fair' | 'Needs Work';
  overallSummary: string;
  metrics: AnalysisMetrics;
}

export interface RoutineProduct {
  product_id: number;
  brand: string;
  title: string;
  product_url: string;
  price_usd: number;
  star_rating: number;
  product_type: string;
  reasoning: string;
}

export interface SkincareRoutine {
  routine_title: string;
  routine_summary: string;
  products: RoutineProduct[];
}

export interface GenerateAnalysisResponse {
  analysis: SkinAnalysis;
  routine: SkincareRoutine;
}

// Prompt template types
export interface PromptVariables {
  questionnaireData: any;
} 