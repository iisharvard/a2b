// Mock fetch for tests
global.fetch = jest.fn();

// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_OPENAI_API_KEY: 'test-api-key'
    }
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 