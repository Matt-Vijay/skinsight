// Input validation for generate-analysis function

// Request body interface
export interface GenerateAnalysisRequest {
  anonymous_questionnaire_id: string;
  image_paths: string[];
}

// Analysis response interfaces
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

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates a UUID string format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates file path format for Supabase storage
 */
function isValidStoragePath(path: string): boolean {
  // Basic validation for storage paths
  if (!path || typeof path !== 'string') return false;
  
  // Should not start with slash
  if (path.startsWith('/')) return false;
  
  // Should contain valid characters and file extension
  const pathRegex = /^[a-zA-Z0-9\-_\/\.]+\.(jpg|jpeg|png|webp)$/i;
  return pathRegex.test(path);
}

/**
 * Validates the request body for generate-analysis function
 * @param body - The request body to validate
 * @returns GenerateAnalysisRequest - The validated request
 * @throws ValidationError - If validation fails
 */
export function validateGenerateAnalysisRequest(body: any): GenerateAnalysisRequest {
  // Check if body exists and is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  // Validate anonymous_questionnaire_id
  const { anonymous_questionnaire_id, image_paths } = body;

  if (!anonymous_questionnaire_id) {
    throw new ValidationError('Missing required field: anonymous_questionnaire_id', 'anonymous_questionnaire_id');
  }

  if (typeof anonymous_questionnaire_id !== 'string') {
    throw new ValidationError('anonymous_questionnaire_id must be a string', 'anonymous_questionnaire_id');
  }

  if (!isValidUUID(anonymous_questionnaire_id)) {
    throw new ValidationError('anonymous_questionnaire_id must be a valid UUID', 'anonymous_questionnaire_id');
  }

  // Validate image_paths
  if (!image_paths) {
    throw new ValidationError('Missing required field: image_paths', 'image_paths');
  }

  if (!Array.isArray(image_paths)) {
    throw new ValidationError('image_paths must be an array', 'image_paths');
  }

  if (image_paths.length === 0) {
    throw new ValidationError('image_paths array cannot be empty', 'image_paths');
  }

  if (image_paths.length > 10) {
    throw new ValidationError('Too many image paths (maximum 10 allowed)', 'image_paths');
  }

  // Validate each image path
  for (let i = 0; i < image_paths.length; i++) {
    const path = image_paths[i];
    
    if (typeof path !== 'string') {
      throw new ValidationError(`image_paths[${i}] must be a string`, 'image_paths');
    }

    if (!isValidStoragePath(path)) {
      throw new ValidationError(
        `image_paths[${i}] is not a valid storage path. Must be a valid file path with supported extension (jpg, jpeg, png, webp)`,
        'image_paths'
      );
    }
  }

  return {
    anonymous_questionnaire_id,
    image_paths,
  };
}

/**
 * Validates the AI response structure
 * @param response - The AI response to validate
 * @throws ValidationError - If validation fails
 */
export function validateAnalysisResponse(response: any): GenerateAnalysisResponse {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('AI response must be a valid object');
  }

  // Validate analysis section
  if (!response.analysis) {
    throw new ValidationError('Missing analysis section in AI response');
  }

  const { analysis, routine } = response;

  // Validate analysis fields
  if (typeof analysis.overallScore !== 'number' || analysis.overallScore < 1 || analysis.overallScore > 99) {
    throw new ValidationError('overallScore must be a number between 1 and 99');
  }

  const validStates = ['Excellent', 'Good', 'Fair', 'Needs Work'];
  if (!validStates.includes(analysis.primaryState)) {
    throw new ValidationError(`primaryState must be one of: ${validStates.join(', ')}`);
  }

  if (!analysis.overallSummary || typeof analysis.overallSummary !== 'string') {
    throw new ValidationError('overallSummary must be a non-empty string');
  }

  if (analysis.overallSummary.length < 200 || analysis.overallSummary.length > 300) {
    throw new ValidationError('overallSummary must be between 200-300 characters');
  }

  // Validate metrics
  if (!analysis.metrics) {
    throw new ValidationError('Missing metrics in analysis');
  }

  // --- NEW: Validate Blueprint ---
  if (!analysis.blueprint) {
    throw new ValidationError('Missing blueprint in analysis');
  }

  const { metrics } = analysis;
  
  if (typeof metrics.hydration !== 'number' || metrics.hydration < 1 || metrics.hydration > 99) {
    throw new ValidationError('hydration metric must be a number between 1 and 99');
  }

  if (typeof metrics.barrier !== 'number' || metrics.barrier < 1 || metrics.barrier > 99) {
    throw new ValidationError('barrier metric must be a number between 1 and 99');
  }

  // Validate routine section
  if (!routine) {
    throw new ValidationError('Missing routine section in AI response');
  }

  if (!routine.routine_title || typeof routine.routine_title !== 'string') {
    throw new ValidationError('routine_title must be a non-empty string');
  }

  if (!routine.routine_summary || typeof routine.routine_summary !== 'string') {
    throw new ValidationError('routine_summary must be a non-empty string');
  }

  if (!Array.isArray(routine.products) || routine.products.length !== 4) {
    throw new ValidationError('routine must contain exactly 4 products (cleanser, treatment, moisturizer, sunscreen)');
  }

  // Validate we have the required categories
  const productTypes = routine.products.map((p: any) => p.product_type.toLowerCase());
  const requiredTypes = ['cleanser', 'moisturizer', 'sunscreen'];
  const treatmentTypes = ['serum', 'toner', 'treatment'];

  for (const required of requiredTypes) {
    if (!productTypes.some((type: string) => type.includes(required))) {
      throw new ValidationError(`Missing required product category: ${required}`);
    }
  }

  // Check for exactly one treatment type
  const treatmentCount = productTypes.filter((type: string) => 
    treatmentTypes.some((treatment: string) => type.includes(treatment))
  ).length;

  if (treatmentCount !== 1) {
    throw new ValidationError('Must have exactly one treatment product (serum, toner, or treatment)');
  }

  // Validate each product
  for (let i = 0; i < routine.products.length; i++) {
    const product = routine.products[i];
    
    if (typeof product.product_id !== 'number' || product.product_id <= 0) {
      throw new ValidationError(`Product ${i + 1}: product_id must be a positive number`);
    }

    if (!product.brand || typeof product.brand !== 'string') {
      throw new ValidationError(`Product ${i + 1}: brand must be a non-empty string`);
    }

    if (!product.title || typeof product.title !== 'string') {
      throw new ValidationError(`Product ${i + 1}: title must be a non-empty string`);
    }

    if (!product.product_url || typeof product.product_url !== 'string') {
      throw new ValidationError(`Product ${i + 1}: product_url must be a non-empty string`);
    }

    if (typeof product.price_usd !== 'number' || product.price_usd < 0) {
      throw new ValidationError(`Product ${i + 1}: price_usd must be a non-negative number`);
    }

    if (typeof product.star_rating !== 'number' || product.star_rating < 0 || product.star_rating > 5) {
      throw new ValidationError(`Product ${i + 1}: star_rating must be a number between 0 and 5`);
    }

    if (!product.product_type || typeof product.product_type !== 'string') {
      throw new ValidationError(`Product ${i + 1}: product_type must be a non-empty string`);
    }

    if (!product.reasoning || typeof product.reasoning !== 'string') {
      throw new ValidationError(`Product ${i + 1}: reasoning must be a non-empty string`);
    }

    if (product.reasoning.length < 30 || product.reasoning.length > 100) {
      throw new ValidationError(`Product ${i + 1}: reasoning must be between 30-100 characters for clean display`);
    }
  }

  return response as GenerateAnalysisResponse;
} 