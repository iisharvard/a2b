import { OpenAIProvider } from '../openai';
import { LLMCompletionRequest, LLMError, LLMMessage } from '../../../../types/llm';
import axios from 'axios';
import { Readable } from 'stream';

// Mock axios and fetch
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fetch and Response
global.fetch = jest.fn();
const mockResponse = {
  ok: true,
  body: {
    getReader: jest.fn().mockReturnValue({
      read: jest.fn().mockResolvedValue({ done: true })
    })
  }
};
(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

// Mock ReadableStream and TextEncoder for Node.js environment
class MockReadableStream {
  private chunks: Uint8Array[];
  private index: number;

  constructor(chunks: Uint8Array[]) {
    this.chunks = chunks;
    this.index = 0;
  }

  getReader() {
    return {
      read: async () => {
        if (this.index < this.chunks.length) {
          return { done: false, value: this.chunks[this.index++] };
        }
        return { done: true, value: undefined };
      },
      cancel: async () => {},
      releaseLock: () => {},
    };
  }
}

// Declare global types
declare global {
  interface Window {
    ReadableStream: typeof MockReadableStream;
    TextEncoder: new () => { encode(str: string): Uint8Array };
  }
}

// Set up global mocks
Object.defineProperty(global, 'ReadableStream', {
  value: MockReadableStream,
  writable: true,
});

Object.defineProperty(global, 'TextEncoder', {
  value: class {
    encode(str: string): Uint8Array {
      return Buffer.from(str);
    }
  },
  writable: true,
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4',
      temperature: 0.7
    });
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should make a successful API call', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Test response'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const request: LLMCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5
      };

      const response = await provider.complete(request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4',
          messages: request.messages,
          temperature: 0.5,
          max_tokens: undefined
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      );

      expect(response).toEqual({
        content: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      });
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'API Error'
            }
          },
          status: 429,
          headers: {
            'retry-after': '60'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      const request: LLMCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(provider.complete(request)).rejects.toMatchObject({
        code: 'API_ERROR',
        message: 'API Error',
        status: 429,
        retryAfter: 60
      });
    });

    it('should handle network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      const request: LLMCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(provider.complete(request)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        status: 0
      });
    });
  });

  describe('streamComplete', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Hello!' },
    ];

    beforeEach(() => {
      // Reset all mocks before each test
      global.fetch = jest.fn();
    });

    test('should handle streaming responses', async () => {
      const tokens: string[] = [];
      const callbacks = {
        onToken: (token: string) => tokens.push(token),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      // Mock fetch response with streaming data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            let count = 0;
            return {
              read: async () => {
                count++;
                if (count === 1) {
                  return {
                    done: false,
                    value: new TextEncoder().encode('data: {"id":"1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}\n\n')
                  };
                } else if (count === 2) {
                  return {
                    done: false,
                    value: new TextEncoder().encode('data: {"id":"2","object":"chat.completion.chunk","choices":[{"delta":{"content":" World"}}]}\n\n')
                  };
                } else if (count === 3) {
                  return {
                    done: false,
                    value: new TextEncoder().encode('data: [DONE]\n\n')
                  };
                } else {
                  return { done: true, value: undefined };
                }
              },
              cancel: () => Promise.resolve(),
              releaseLock: () => {},
            };
          }
        }
      });

      await provider.streamComplete({ messages }, callbacks);

      expect(tokens).toEqual(['Hello', ' World']);
      expect(callbacks.onComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    test('should handle streaming errors', async () => {
      const callbacks = {
        onToken: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      // Mock fetch response with error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: {
            message: 'API Error',
          },
        }),
        headers: {
          get: (name: string) => name === 'retry-after' ? '0' : null,
        },
      });

      await provider.streamComplete({ messages }, callbacks);

      expect(callbacks.onToken).not.toHaveBeenCalled();
      expect(callbacks.onComplete).not.toHaveBeenCalled();
      expect(callbacks.onError).toHaveBeenCalledWith({
        code: 'API_ERROR',
        message: 'API Error',
        status: 500,
        retryAfter: 0,
      });
    });
  });
}); 