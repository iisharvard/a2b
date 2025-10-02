// API Configuration

// OpenAI API configuration
export const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
export let OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''; // Default to empty string if not set

// Gemini API configuration
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
export let GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''; // Default to empty string if not set
export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';
export const GEMINI_LITE_MODEL_NAME = 'gemini-2.0-flash-lite';

// Try to load environment variables from the env.ts file in the browser
if (typeof window !== 'undefined') {
  // This import will be handled by Vite in the browser
  import('./env').then(env => {
    const envVars = env.getEnv();
    OPENAI_API_KEY = envVars.OPENAI_API_KEY;
    // Attempt to load Gemini API key from env.ts as well
    if (envVars.GEMINI_API_KEY) {
      GEMINI_API_KEY = envVars.GEMINI_API_KEY;
    }
  }).catch(() => {
    // Ignore errors in test environment
  });
}

export const MODEL = 'gpt-4o'; // or 'gpt-3.5-turbo' for a more cost-effective option
export const TEMPERATURE = 0.5;
export const MAX_OUTPUT_TOKENS = 8192; // Maximum for Gemini 1.5 Flash

// Default model for general processing (can be overridden)
export const PROCESSING_MODEL = GEMINI_MODEL_NAME; // Use Gemini
export const CHAT_MODEL = MODEL; // Keep OpenAI for chat

// Rate limiting configuration
export const RATE_LIMIT = {
  requests: 10,     // Number of requests allowed per interval
  interval: 60000,  // Time window in milliseconds (1 minute)
  minDelay: 200,    // Minimum delay between requests in ms
  maxRetries: 3,    // Maximum number of retries for rate limit errors
  backoffFactor: 2, // Exponential backoff factor
  initialRetryDelay: 1000, // Initial retry delay in ms
}; 
