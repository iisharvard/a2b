// Environment variables for the browser
// This file is imported by config.ts in the browser environment

// Access environment variables using Vite's approach
export const getEnv = () => {
  return {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || ''
  };
}; 