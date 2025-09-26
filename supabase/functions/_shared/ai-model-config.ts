// Centralized AI Model Configuration and Fallback System
// This module provides optimized model selection and robust fallback handling

export interface AIModelConfig {
  model: string;
  maxTokens?: number;
  maxCompletionTokens?: number;
  temperature?: number;
  supportsTemperature: boolean;
  supportsVision: boolean;
  costTier: 'nano' | 'mini' | 'standard' | 'premium';
  speedTier: 'fastest' | 'fast' | 'standard' | 'slow';
  reliabilityScore: number;
}

// Model configurations with proper parameter mapping
export const AI_MODELS: Record<string, AIModelConfig> = {
  // Latest Generation Models (Recommended)
  'gpt-5-nano-2025-08-07': {
    model: 'gpt-5-nano-2025-08-07',
    maxCompletionTokens: 2000, // Use max_completion_tokens
    supportsTemperature: false, // No temperature parameter
    supportsVision: false,
    costTier: 'nano',
    speedTier: 'fastest',
    reliabilityScore: 0.95
  },
  'gpt-5-mini-2025-08-07': {
    model: 'gpt-5-mini-2025-08-07',
    maxCompletionTokens: 4000,
    supportsTemperature: false,
    supportsVision: false,
    costTier: 'mini',
    speedTier: 'fast',
    reliabilityScore: 0.98
  },
  'gpt-5-2025-08-07': {
    model: 'gpt-5-2025-08-07',
    maxCompletionTokens: 8000,
    supportsTemperature: false,
    supportsVision: true,
    costTier: 'premium',
    speedTier: 'standard',
    reliabilityScore: 0.99
  },
  'gpt-4.1-mini-2025-04-14': {
    model: 'gpt-4.1-mini-2025-04-14',
    maxCompletionTokens: 4000,
    supportsTemperature: false,
    supportsVision: true,
    costTier: 'mini',
    speedTier: 'fast',
    reliabilityScore: 0.97
  },
  'gpt-4.1-2025-04-14': {
    model: 'gpt-4.1-2025-04-14',
    maxCompletionTokens: 8000,
    supportsTemperature: false,
    supportsVision: true,
    costTier: 'standard',
    speedTier: 'standard',
    reliabilityScore: 0.98
  },
  
  // Legacy Models (Fallback)
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokens: 4000, // Legacy uses max_tokens
    temperature: 0.7,
    supportsTemperature: true,
    supportsVision: true,
    costTier: 'mini',
    speedTier: 'fast',
    reliabilityScore: 0.95
  },
  'gpt-4o': {
    model: 'gpt-4o',
    maxTokens: 8000,
    temperature: 0.7,
    supportsTemperature: true,
    supportsVision: true,
    costTier: 'premium',
    speedTier: 'standard',
    reliabilityScore: 0.96
  }
};

// Embedding model configurations
export const EMBEDDING_MODELS = {
  'text-embedding-3-large': {
    model: 'text-embedding-3-large',
    dimensions: 1536,
    costTier: 'premium',
    reliabilityScore: 0.99
  },
  'text-embedding-3-small': {
    model: 'text-embedding-3-small', 
    dimensions: 1536,
    costTier: 'standard',
    reliabilityScore: 0.97
  }
};

// Task-specific model selection
export const TASK_MODELS = {
  // Fast categorization and simple tasks
  categorization: ['gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-mini-2025-04-14', 'gpt-4o-mini'],
  
  // General chat and conversation
  conversation: ['gpt-5-mini-2025-08-07', 'gpt-5-2025-08-07', 'gpt-4.1-mini-2025-04-14', 'gpt-4o-mini'],
  
  // Complex legal analysis
  legal_analysis: ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07', 'gpt-4o'],
  
  // Evidence processing and synthesis
  evidence_processing: ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07', 'gpt-4o'],
  
  // Timeline extraction
  timeline_extraction: ['gpt-5-mini-2025-08-07', 'gpt-4.1-mini-2025-04-14', 'gpt-5-nano-2025-08-07', 'gpt-4o-mini'],
  
  // Pattern analysis
  pattern_analysis: ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07', 'gpt-4o'],
  
  // Search and retrieval
  search_processing: ['gpt-5-mini-2025-08-07', 'gpt-4.1-mini-2025-04-14', 'gpt-5-nano-2025-08-07', 'gpt-4o-mini']
};

export async function makeOpenAIRequest(
  taskType: keyof typeof TASK_MODELS,
  messages: any[],
  options: {
    maxRetries?: number;
    responseFormat?: 'json_object' | 'text';
    customMaxTokens?: number;
    forceModel?: string;
  } = {}
): Promise<any> {
  
  const { maxRetries = 3, responseFormat, customMaxTokens, forceModel } = options;
  const modelCandidates = forceModel ? [forceModel] : TASK_MODELS[taskType];
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  let lastError: Error | null = null;
  
  // Try each model in the fallback chain
  for (const modelName of modelCandidates) {
    const modelConfig = AI_MODELS[modelName];
    if (!modelConfig) continue;
    
    // Try the current model with retry logic
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`🤖 Attempting ${taskType} with ${modelName} (attempt ${retry + 1})`);
        
        const requestBody: any = {
          model: modelConfig.model,
          messages,
        };
        
        // Set token limits based on model type
        if (modelConfig.maxCompletionTokens) {
          requestBody.max_completion_tokens = customMaxTokens || modelConfig.maxCompletionTokens;
        } else if (modelConfig.maxTokens) {
          requestBody.max_tokens = customMaxTokens || modelConfig.maxTokens;
        }
        
        // Add temperature only for models that support it
        if (modelConfig.supportsTemperature && modelConfig.temperature !== undefined) {
          requestBody.temperature = modelConfig.temperature;
        }
        
        // Add response format if specified
        if (responseFormat) {
          requestBody.response_format = { type: responseFormat };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Success with ${modelName} on attempt ${retry + 1}`);
          return data;
        }
        
        const errorText = await response.text();
        const error = new Error(`OpenAI API error (${response.status}): ${errorText}`);
        
        // Don't retry on certain errors
        if (response.status === 400 || response.status === 401) {
          throw error;
        }
        
        lastError = error;
        console.log(`⚠️ ${modelName} failed (attempt ${retry + 1}): ${error.message}`);
        
        // Exponential backoff for retries
        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`❌ ${modelName} error (attempt ${retry + 1}): ${lastError.message}`);
        
        // Don't retry on auth/config errors
        if (lastError.message.includes('API key') || lastError.message.includes('401')) {
          throw lastError;
        }
      }
    }
    
    console.log(`🔄 Falling back from ${modelName} after ${maxRetries} attempts`);
  }
  
  throw lastError || new Error(`All models failed for task: ${taskType}`);
}

export async function generateEmbedding(
  text: string,
  model: 'text-embedding-3-large' | 'text-embedding-3-small' = 'text-embedding-3-large'
): Promise<number[]> {
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const modelConfig = EMBEDDING_MODELS[model];
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.model,
        input: text,
        dimensions: modelConfig.dimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
    
  } catch (error) {
    console.error(`Embedding generation failed for ${model}:`, error);
    
    // Fallback to smaller model if large model fails
    if (model === 'text-embedding-3-large') {
      console.log('🔄 Falling back to text-embedding-3-small');
      return generateEmbedding(text, 'text-embedding-3-small');
    }
    
    throw error;
  }
}

// Performance monitoring
export interface ModelPerformanceMetrics {
  model: string;
  successRate: number;
  averageLatency: number;
  totalRequests: number;
  lastUsed: Date;
}

// Simple in-memory performance tracking
const performanceMetrics = new Map<string, ModelPerformanceMetrics>();

export function recordModelPerformance(model: string, success: boolean, latency: number) {
  const current = performanceMetrics.get(model) || {
    model,
    successRate: 0,
    averageLatency: 0,
    totalRequests: 0,
    lastUsed: new Date()
  };
  
  current.totalRequests++;
  current.successRate = (current.successRate * (current.totalRequests - 1) + (success ? 1 : 0)) / current.totalRequests;
  current.averageLatency = (current.averageLatency * (current.totalRequests - 1) + latency) / current.totalRequests;
  current.lastUsed = new Date();
  
  performanceMetrics.set(model, current);
}

export function getModelPerformance(): ModelPerformanceMetrics[] {
  return Array.from(performanceMetrics.values());
}