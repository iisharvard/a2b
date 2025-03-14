// Mock import.meta.env for Jest
if (typeof global.import === 'undefined') {
  global.import = {};
}

if (typeof global.import.meta === 'undefined') {
  global.import.meta = {};
}

global.import.meta.env = {
  VITE_OPENAI_API_KEY: 'test-api-key',
  // Add any other environment variables you need for tests
}; 