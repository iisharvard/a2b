import { OpenAIProvider } from '../openai';
import { LLMRequest, LLMError, LLMMessage } from '../../../../types/llm';
import axios from 'axios';
import { TextDecoder } from 'util';

// Mock axios and fetch
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fetch and Response
global.fetch = jest.fn();
(global as any).TextDecoder = TextDecoder;
(global as any).TextEncoder = class {
  encode(str: string): Uint8Array {
    return Buffer.from(str);
  }
};

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

// Set up global mocks
Object.defineProperty(global, 'ReadableStream', {
  value: MockReadableStream,
  writable: true,
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4o',
      temperature: 0.7
    });
    jest.clearAllMocks();
  });

  describe('getResponse', () => {
    it('should make a successful API call', async () => {
      const mockResponse = {
        data: {
          output: [{
            content: [{
              text: 'Test response'
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

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5
      };

      const response = await provider.getResponse(request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          model: 'gpt-4o',
          input: 'user: Hello',
          temperature: 0.5,
          text: {
            format: {
              type: 'text'
            }
          }
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
          inputTokens: 10,
          outputTokens: 20,
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

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(provider.getResponse(request)).rejects.toMatchObject({
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

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(provider.getResponse(request)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        status: 0
      });
    });
  });

  describe('streamResponse', () => {
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
      const mockStream = new MockReadableStream([
        new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Hello"}\n\n'),
        new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":" World"}\n\n'),
        new TextEncoder().encode('data: [DONE]\n\n')
      ]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockStream
      });

      await provider.streamResponse({ messages }, callbacks);

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

      await provider.streamResponse({ messages }, callbacks);

      expect(callbacks.onToken).not.toHaveBeenCalled();
      expect(callbacks.onComplete).not.toHaveBeenCalled();
      expect(callbacks.onError).toHaveBeenCalledWith({
        code: 'API_ERROR',
        message: 'API Error',
        status: 500,
        retryAfter: 0
      });
    });
  });
}); 