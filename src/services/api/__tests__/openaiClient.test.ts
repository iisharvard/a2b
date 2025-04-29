import axios from 'axios';
import { callOpenAI } from '../openaiClient';
import { requestQueue } from '../requestQueue';
import { OpenAIMessage } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock request queue - simplified approach
jest.mock('../requestQueue');
const mockAdd = jest.fn(fn => fn());
(requestQueue.add as jest.Mock) = mockAdd;

// Mock config to provide a test API key
jest.mock('../config', () => ({
  OPENAI_API_URL: 'https://api.openai.com/v1/responses',
  OPENAI_API_KEY: 'test-api-key',
  MODEL: 'gpt-4o',
  TEMPERATURE: 0,
  RATE_LIMIT: {
    requests: 3,
    interval: 60000,
    minDelay: 1000
  }
}));

// Mock console methods to reduce noise
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock setTimeout to execute immediately
jest.mock('timers', () => ({
  setTimeout: (callback: Function) => callback(),
}));

describe('OpenAI Client - Success Scenarios', () => {
  const messages: OpenAIMessage[] = [{ role: 'user' as const, content: 'Hello!' }];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default implementation
    mockAdd.mockImplementation(fn => fn());
  });

  test('should call OpenAI API and return response content', async () => {
    const mockResponse = {
      data: {
        output: [{
          content: [{
            text: 'Hello, how can I help you?'
          }]
        }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30
        }
      }
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await callOpenAI(messages);

    expect(result).toEqual({
      text: 'Hello, how can I help you?',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30
      }
    });
  });

  test('should handle rate limit errors and retry', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: {
          error: {
            message: 'Rate limit exceeded'
          }
        },
        headers: {
          'retry-after': '1',
        },
      },
    };

    const successResponse = {
      data: {
        output: [{
          content: [{
            text: 'Success after retry'
          }]
        }],
        usage: {
          input_tokens: 5,
          output_tokens: 10,
          total_tokens: 15
        }
      }
    };

    let callCount = 0;
    mockAdd.mockImplementation(async (fn) => {
      callCount++;
      if (callCount === 1) {
        mockedAxios.post.mockRejectedValueOnce(rateLimitError);
      } else {
        mockedAxios.post.mockResolvedValueOnce(successResponse);
      }
      return fn();
    });

    const result = await callOpenAI(messages);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      text: 'Success after retry',
      usage: {
        input_tokens: 5,
        output_tokens: 10,
        total_tokens: 15
      }
    });
  });
});

// Test error cases separately
describe('OpenAI Client - Error Handling', () => {
  const messages: OpenAIMessage[] = [{ role: 'user' as const, content: 'Hello!' }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockImplementation(fn => fn());
  });

  test('should handle authentication errors', async () => {
    const authError = {
      response: {
        status: 401,
        data: {
          error: 'Invalid API key',
        },
      },
    };

    mockedAxios.post.mockRejectedValueOnce(authError);

    await expect(callOpenAI(messages)).rejects.toThrow('OpenAI API authentication failed');
  });

  test('should handle bad request errors', async () => {
    const badRequestError = {
      response: {
        status: 400,
        data: {
          error: 'Bad request',
        },
      },
    };

    mockedAxios.post.mockRejectedValueOnce(badRequestError);

    await expect(callOpenAI(messages)).rejects.toThrow('Invalid request to OpenAI API');
  });

  test('should handle network errors', async () => {
    const networkError = {
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    };

    mockedAxios.post.mockRejectedValueOnce(networkError);

    await expect(callOpenAI(messages)).rejects.toThrow('Network error when calling OpenAI API');
  });
}); 