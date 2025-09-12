import axios from 'axios';
import { LLMError } from '../../types/llm';
import { OPENAI_API_URL, OPENAI_API_KEY, MODEL, TEMPERATURE, MAX_OUTPUT_TOKENS, GEMINI_API_KEY, GEMINI_MODEL_NAME, GEMINI_API_URL } from './config';
import { requestQueue } from './requestQueue';
import { OpenAIMessage, OpenAIResponseRequest, GeminiMessage, GeminiRequest, GeminiResponse, GeminiStreamChunk } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        max_output_tokens: MAX_OUTPUT_TOKENS, // Limit response length
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
        max_output_tokens: MAX_OUTPUT_TOKENS, // Limit response length
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

/**
 * Helper to convert OpenAI messages to Gemini messages
 */
const convertToGeminiMessages = (messages: OpenAIMessage[] | Array<{ role: string; content: string }>): GeminiMessage[] => {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' for assistant messages
    parts: [{ text: msg.content }],
  }));
};

/**
 * Call Gemini API with error handling
 */
export const callGemini = async (
  messages: OpenAIMessage[] | Array<{ role: string; content: string }>,
  responseFormat?: { type: string }, // Note: Gemini's JSON mode is handled differently
  temperature?: number,
  apiKey: string = GEMINI_API_KEY,
  modelName: string = GEMINI_MODEL_NAME
): Promise<{ text: string; usage?: any }> => {
  try {
    if (!apiKey) {
      throw { code: 'AUTH_ERROR', message: 'Gemini API key is not configured' } as LLMError;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Convert messages to Gemini format
    const geminiMessages = convertToGeminiMessages(messages);

    // Configure generation settings
    const generationConfig = {
      temperature: temperature ?? TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS, // Limit response length
      // Note: Gemini's responseMimeType might cause issues with empty responses
      // We'll rely on prompt instructions for JSON formatting instead
    };
    
    console.log('🔧 Generation config:', generationConfig);
    console.log('🔧 Response format requested:', responseFormat);

    console.log('🔍 Gemini request details:', {
      model: modelName,
      contents: geminiMessages,
      generationConfig,
      apiKeyLength: apiKey?.length,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...'
    });

    const result = await model.generateContent({
      contents: geminiMessages,
      generationConfig,
    });

    console.log('📦 Raw Gemini result:', result);

    const response = await result.response;
    console.log('📨 Gemini response object:', response);
    console.log('📨 Response candidates:', response.candidates);
    console.log('📨 Response promptFeedback:', response.promptFeedback);
    
    // Log individual candidate details
    if (response.candidates && response.candidates.length > 0) {
      response.candidates.forEach((candidate, index) => {
        console.log(`📨 Candidate ${index}:`, candidate);
        console.log(`📨 Candidate ${index} content:`, candidate.content);
        console.log(`📨 Candidate ${index} content.parts:`, candidate.content?.parts);
        if (candidate.content?.parts) {
          candidate.content.parts.forEach((part, partIndex) => {
            console.log(`📨 Candidate ${index} part ${partIndex}:`, part);
            console.log(`📨 Candidate ${index} part ${partIndex} text:`, part.text);
          });
        }
        console.log(`📨 Candidate ${index} finishReason:`, candidate.finishReason);
        console.log(`📨 Candidate ${index} safetyRatings:`, candidate.safetyRatings);
        
        // Check if response was truncated due to max tokens
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.error('⚠️ Response was truncated due to MAX_TOKENS limit');
          throw { 
            code: 'RESPONSE_TRUNCATED', 
            message: 'Gemini response was truncated. Try with a shorter prompt or increase MAX_OUTPUT_TOKENS.' 
          } as LLMError;
        }
      });
    }
    
    let text = '';
    
    try {
      // Try the standard text() method first
      text = response.text();
    } catch (textError) {
      console.warn('⚠️ Standard text() extraction failed, trying alternative methods:', textError);
      
      // If text() fails, try to extract from candidates directly
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          text = candidate.content.parts.map(part => part.text || '').join('');
          console.log('✅ Extracted text from candidate parts:', text.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('📝 Extracted text:', text);
    console.log('📝 Text length:', text?.length);
    console.log('📝 Text type:', typeof text);

    if (!text) {
      console.error('❌ Empty response detected. Full response object:', {
        response,
        candidates: response.candidates,
        promptFeedback: response.promptFeedback,
        result
      });
      throw { code: 'EMPTY_RESPONSE', message: 'Empty response from Gemini API' } as LLMError;
    }

    return {
      text,
      usage: {
        // Gemini doesn't provide token usage information in the same way as OpenAI
        // You might want to implement your own token counting if needed
      }
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Re-throw if it's already an LLMError
    if (error.code && error.message) {
      throw error;
    }
    
    if (error.message?.includes('API key')) {
      throw { code: 'AUTH_ERROR', message: 'Invalid Gemini API key' } as LLMError;
    }
    
    if (error.message?.includes('safety')) {
      throw { code: 'CONTENT_FILTER', message: 'Content blocked by Gemini safety filters' } as LLMError;
    }
    
    throw { 
      code: 'API_ERROR', 
      message: error.message || 'Unknown error from Gemini API',
      details: error
    } as LLMError;
  }
};

/**
 * Stream Gemini API responses with error handling
 */
export const streamGemini = async (
  messages: OpenAIMessage[] | Array<{ role: string; content: string }>,
  callbacks: {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: LLMError) => void;
  },
  responseFormat?: { type: string },
  temperature?: number,
  apiKey: string = GEMINI_API_KEY,
  modelName: string = GEMINI_MODEL_NAME
): Promise<void> => {
  try {
    if (!apiKey) {
      callbacks.onError({ code: 'AUTH_ERROR', message: 'Gemini API key is not configured' } as LLMError);
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Convert messages to Gemini format
    const geminiMessages = convertToGeminiMessages(messages);

    // Configure generation settings
    const generationConfig = {
      temperature: temperature ?? TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS, // Limit response length
      // Note: Gemini's responseMimeType might cause issues with empty responses
      // We'll rely on prompt instructions for JSON formatting instead
    };

    const result = await model.generateContentStream({
      contents: geminiMessages,
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        callbacks.onToken(text);
      }
    }

    callbacks.onComplete();
  } catch (error: any) {
    console.error('Gemini streaming error:', error);
    
    if (error.message?.includes('API key')) {
      callbacks.onError({ code: 'AUTH_ERROR', message: 'Invalid Gemini API key' } as LLMError);
      return;
    }
    
    if (error.message?.includes('safety')) {
      callbacks.onError({ code: 'CONTENT_FILTER', message: 'Content blocked by Gemini safety filters' } as LLMError);
      return;
    }
    
    callbacks.onError({ 
      code: 'API_ERROR', 
      message: error.message || 'Unknown error from Gemini API'
    } as LLMError);
  }
}; 