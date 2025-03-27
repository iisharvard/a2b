import axios from 'axios';
import { LLMError } from '../../types/llm';
import { OPENAI_API_URL, OPENAI_API_KEY, MODEL, TEMPERATURE } from './config';
import { requestQueue } from './requestQueue';
import { OpenAIMessage, OpenAIResponseRequest } from './types';

// Define OpenAIError interface locally since it was removed from types.ts
interface OpenAIError {
  response?: {
    status: number;
    data: any;
    headers: {
      'retry-after'?: string;
    };
  };
  message: string;
}

interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  error: null | any;
  incomplete_details: null | any;
  instructions: null | any;
  max_output_tokens: null | number;
  model: string;
  output: Array<{
    type: string;
    id: string;
    status: string;
    role: string;
    content: Array<{
      type: string;
      text: string;
      annotations: any[];
    }>;
  }>;
  parallel_tool_calls: boolean;
  previous_response_id: null | string;
  reasoning: {
    effort: null | any;
    generate_summary: null | any;
  };
  store: boolean;
  temperature: number;
  text: {
    format: {
      type: string;
    };
  };
  tool_choice: string;
  tools: any[];
  top_p: number;
  truncation: string;
  usage: {
    input_tokens: number;
    input_tokens_details: {
      cached_tokens: number;
    };
    output_tokens: number;
    output_tokens_details: {
      reasoning_tokens: number;
    };
    total_tokens: number;
  };
  user: null | any;
  metadata: Record<string, any>;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface StreamEvent {
  type: string;
  data?: any;
  delta?: string;
  text?: string;
  response?: OpenAIResponse;
  output_index?: number;
  content_index?: number;
  item_id?: string;
  item?: any;
  part?: any;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Call OpenAI API with rate limiting and error handling
 */
export const callOpenAI = async (
  messages: Array<{ role: string; content: string }>,
  responseFormat?: { type: string },
  temperature?: number,
  apiKey?: string
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } }> => {
  const makeRequest = async () => {
    try {
      // Convert messages array to a single string input
      const input = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      const requestBody = {
        model: MODEL,
        input: input,
        temperature: temperature ?? TEMPERATURE,
        text: {
          format: {
            type: responseFormat?.type || 'text'
          }
        }
      };

      console.log('Sending request to OpenAI:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post<OpenAIResponse>(
        OPENAI_API_URL,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || OPENAI_API_KEY}`
          }
        }
      );

      return {
        text: response.data.output[0].content[0].text,
        usage: {
          input_tokens: response.data.usage.input_tokens,
          output_tokens: response.data.usage.output_tokens,
          total_tokens: response.data.usage.total_tokens
        }
      };
    } catch (error: any) {
      // Log error details
      console.error('Error calling OpenAI API:', error);
      if (error.response) {
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        // Transform error based on status code
        switch (error.response.status) {
          case 429:
            // For rate limit errors, create a standardized error object
            // that matches the expected format in the tests
            const retryAfter = parseInt(error.response.headers?.['retry-after'] || '60', 10);
            const apiError = {
              code: 'API_ERROR',
              message: error.response.data?.error?.message || 'API Error',
              status: error.response.status,
              retryAfter: retryAfter
            };
            throw apiError;
          case 401:
            throw new Error('OpenAI API authentication failed');
          case 400:
            throw new Error('Invalid request to OpenAI API');
          default:
            throw new Error('OpenAI API request failed');
        }
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network')) {
        throw new Error('Network error when calling OpenAI API');
      }

      // For all other errors, throw the original error
      throw error;
    }
  };

  // Use request queue to handle rate limiting
  return await requestQueue.add(makeRequest);
};

/**
 * Stream OpenAI API responses with rate limiting and error handling
 */
export const streamOpenAI = async (
  messages: Array<{ role: string; content: string }>,
  callbacks: {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: LLMError) => void;
  },
  temperature?: number,
  apiKey?: string
): Promise<void> => {
  const makeRequest = async () => {
    try {
      // Convert messages array to a single string input
      const input = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      const requestBody = {
        model: MODEL,
        input: input,
        temperature: temperature ?? TEMPERATURE,
        stream: true,
        text: {
          format: {
            type: 'text'
          }
        }
      };

      console.log('Sending streaming request to OpenAI:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to start streaming');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                callbacks.onComplete();
                return;
              }

              try {
                const event = JSON.parse(data) as StreamEvent;
                console.log('Received event:', event.type);

                switch (event.type) {
                  case 'response.output_text.delta':
                    if (event.delta) callbacks.onToken(event.delta);
                    break;
                  case 'response.output_text.done':
                    if (event.text) callbacks.onToken(event.text);
                    break;
                  case 'response.completed':
                    callbacks.onComplete();
                    return;
                  case 'response.error':
                    throw new Error(event.data?.error?.message || 'Streaming error');
                }
              } catch (e) {
                console.error('Error parsing event:', e);
              }
            }
          }
        }
        callbacks.onComplete();
      } catch (error) {
        console.error('Stream error:', error);
        callbacks.onError(handleError(error as Error));
      }
    } catch (error: any) {
      console.error('Request error:', error);
      callbacks.onError(handleError(error));
    }
  };

  // Use request queue to handle rate limiting
  return await requestQueue.add(makeRequest);
};

const handleError = (error: any): LLMError => {
  // Handle API errors (when we have a response)
  if (error.response) {
    const retryAfter = parseInt(error.response.headers?.['retry-after'] || '0', 10);
    return {
      code: 'API_ERROR',
      message: error.response.data?.error?.message || 'API Error',
      status: error.response.status,
      retryAfter
    };
  }

  // Handle network errors (when we have a request but no response)
  if (error.request || error.message === 'Network Error') {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
      status: 0,
      retryAfter: 0
    };
  }

  // Handle other errors
  return {
    code: 'API_ERROR',
    message: error.message || 'API Error',
    status: 500,
    retryAfter: 0
  };
};

const getRetryAfterValue = (error: { headers: { get: (name: string) => string | null } }): number => {
  const retryAfterHeader = error.headers.get('retry-after');
  if (retryAfterHeader) {
    const retryAfter = parseInt(retryAfterHeader);
    return isNaN(retryAfter) ? 0 : retryAfter;
  }
  return 0;
};

const makeRequest = async (request: OpenAIRequest): Promise<OpenAIResponse> => {
  try {
    console.log('Sending request to OpenAI:', JSON.stringify(request, null, 2));
    const response = await axios.post(OPENAI_API_URL, request, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    // Log error details
    console.error('Error calling OpenAI API:', error);
    if (error.response) {
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);

      // Handle specific error types
      switch (error.response.status) {
        case 401:
          throw new Error('OpenAI API authentication failed');
        case 400:
          throw new Error('Invalid request to OpenAI API');
        case 429:
          // Let the request queue handle rate limit errors
          throw error;
        default:
          throw error;
      }
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network')) {
      throw new Error('Network error when calling OpenAI API');
    }

    // For all other errors, throw the original error
    throw error;
  }
}; 