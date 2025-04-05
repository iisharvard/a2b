// API Configuration

// OpenAI API configuration
export const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

// In a real application, this would be set from environment variables
// For tests, this is mocked in the test files
// In the browser, this will be set from the env.ts file
export let OPENAI_API_KEY = '';

// Try to load environment variables from the env.ts file in the browser
if (typeof window !== 'undefined') {
  // This import will be handled by Vite in the browser
  import('./env').then(env => {
    const envVars = env.getEnv();
    OPENAI_API_KEY = envVars.OPENAI_API_KEY;
  }).catch(() => {
    // Ignore errors in test environment
  });
}

export const MODEL = 'gpt-4o'; // or 'gpt-3.5-turbo' for a more cost-effective option
export const TEMPERATURE = 0.5;

// Rate limiting configuration
export const RATE_LIMIT = {
  requests: 10,     // Number of requests allowed per interval
  interval: 60000,  // Time window in milliseconds (1 minute)
  minDelay: 200,    // Minimum delay between requests in ms
  maxRetries: 3,    // Maximum number of retries for rate limit errors
  backoffFactor: 2, // Exponential backoff factor
  initialRetryDelay: 1000, // Initial retry delay in ms
}; 