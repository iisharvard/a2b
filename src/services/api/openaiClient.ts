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
  messages: OpenAIMessage[] | Array<{ role: string; content: string }>,
  responseFormat?: { type: string },
  temperature?: number,
  apiKey: string = OPENAI_API_KEY
): Promise<{ text: string; usage?: any }> => {
  try {
    const finalTemperature = temperature ?? TEMPERATURE;
    
    console.log('🚀 Sending request to OpenAI:', {
      model: MODEL,
      input: messages,
      temperature: finalTemperature,
      text: responseFormat ? { format: responseFormat } : undefined
    });

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: MODEL,
        input: messages,
        temperature: finalTemperature,
        ...(responseFormat && { text: { format: responseFormat } })
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('📥 Raw OpenAI response:', response.data);

    if (!response.data || !response.data.output || !response.data.output[0] || !response.data.output[0].content) {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Invalid response structure from OpenAI API');
    }

    const text = response.data.output[0].content[0].text;
    console.log('✅ Extracted text from response:', text);

    return {
      text,
      usage: response.data.usage
    };
  } catch (error: any) {
    console.error('❌ OpenAI API error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Transform the error into a more manageable format
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 429) {
        // Rate limit error - preserve the original error structure
        throw {
          response: {
            data: data,
            status: status,
            headers: error.response.headers
          }
        };
      } else if (status === 401) {
        throw new Error('OpenAI API authentication failed');
      } else if (status === 400) {
        throw new Error('Invalid request to OpenAI API');
      } else {
        throw new Error(`OpenAI API error: ${data?.error?.message || error.message}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ No response received:', error.request);
      throw new Error('Network error when calling OpenAI API');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('❌ Request setup error:', error.message);
      throw new Error(`Error setting up OpenAI API request: ${error.message}`);
    }
  }
};

/**
 * Stream OpenAI API responses with rate limiting and error handling
 */
export const streamOpenAI = async (
  messages: Array<{ role: string; content: string }> | OpenAIMessage[],
  callbacks: {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: LLMError) => void;
  },
  temperature?: number,
  apiKey?: string,
  useStringInput: boolean = true,
  model: string = MODEL
): Promise<void> => {
  const makeRequest = async () => {
    try {
      // Prepare input based on format
      const input = useStringInput 
        ? messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : messages;

      const requestBody = {
        model: model,
        input: input,
        temperature: temperature ?? TEMPERATURE,
        stream: true,
        ...(useStringInput && {
        text: {
          format: {
            type: 'text'
          }
        }
        })
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
      let isCompleted = false;

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
                if (!isCompleted) {
                callbacks.onComplete();
                  isCompleted = true;
                }
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
                    // Only process the done event if we haven't already completed
                    if (!isCompleted) {
                      callbacks.onComplete();
                      isCompleted = true;
                      return;
                    }
                    break;
                  case 'response.completed':
                    if (!isCompleted) {
                    callbacks.onComplete();
                      isCompleted = true;
                    }
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
        // Ensure completion callback is called if not already done
        if (!isCompleted) {
        callbacks.onComplete();
        }
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