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
    add: jest.fn((fn) => fn())
  }
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call OpenAI API and return response content', async () => {
    // Mock successful API response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: '{"result": "success"}'
            }
          }
        ]
      }
    });

    // Call the OpenAI API
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    const result = await callOpenAI(messages);

    // Check that axios.post was called with the correct arguments
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toContain('api.openai.com');
    expect(mockedAxios.post.mock.calls[0][1]).toMatchObject({
      model: expect.any(String),
      messages,
      temperature: expect.any(Number),
      max_tokens: expect.any(Number),
      response_format: { type: 'json_object' }
    });

    // Check that the request queue was used
    expect(requestQueue.add).toHaveBeenCalledTimes(1);

    // Check that the result is correct
    expect(result).toBe('{"result": "success"}');
  });

  test('should handle API errors and retry on rate limit', async () => {
    // Mock rate limit error then success
    mockedAxios.post
      .mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '1' }
        }
      })
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"result": "success after retry"}'
              }
            }
          ]
        }
      });

    // Call the OpenAI API
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    
    const result = await callOpenAI(messages);

    // Check that axios.post was called twice (initial + retry)
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);

    // Check that the result is correct
    expect(result).toBe('{"result": "success after retry"}');
  });

  test('should return rate limited flag after max retries', async () => {
    // Mock multiple rate limit errors
    mockedAxios.post
      .mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '1' }
        }
      })
      .mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '1' }
        }
      })
      .mockRejectedValueOnce({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '1' }
        }
      })
      .mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '1' }
        }
      });

    // Call the OpenAI API
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    
    const result = await callOpenAI(messages);

    // Check that axios.post was called 4 times (initial + 3 retries)
    expect(mockedAxios.post).toHaveBeenCalledTimes(4);

    // Check that the result is the rate limited flag
    expect(result).toEqual({ rateLimited: true });
  });

  test('should handle other API errors', async () => {
    // Mock API error
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'Bad request' }
      }
    });

    // Call the OpenAI API
    const messages: OpenAIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    
    // Expect the call to throw an error
    await expect(callOpenAI(messages)).rejects.toThrow('OpenAI API error: 400');
  });
}); 