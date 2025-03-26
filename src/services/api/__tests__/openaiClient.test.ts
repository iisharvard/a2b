import axios from 'axios';
import { callOpenAI } from '../openaiClient';
import { requestQueue } from '../requestQueue';
import { OpenAIMessage } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock request queue to execute the function immediately
jest.mock('../requestQueue', () => ({
  requestQueue: {
    add: jest.fn(fn => fn()),
  },
}));

// Mock config to provide a test API key
jest.mock('../config', () => ({
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
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

describe('OpenAI Client', () => {
  const messages = [{ role: 'user', content: 'Hello!' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call OpenAI API and return response content', async () => {
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'Hello, how can I help you?',
            },
          },
        ],
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await callOpenAI(messages);

    expect(result).toBe('Hello, how can I help you?');
  });

  test('should handle rate limit errors and retry', async () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: {
          error: 'Rate limit exceeded',
        },
        headers: {
          'retry-after': '1',
        },
      },
    };

    const successResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'Success after retry',
            },
          },
        ],
      },
    };

    // First call fails with rate limit, second call succeeds
    mockedAxios.post
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(successResponse);

    // Mock requestQueue.add to simulate retry
    (requestQueue.add as jest.Mock).mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Simulate retry after delay
          return await fn();
        }
        throw error;
      }
    });

    const result = await callOpenAI(messages);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(result).toBe('Success after retry');
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