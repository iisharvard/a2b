/**
 * Service for handling chat-related API calls
 */

import { LLMProvider, LLMRequest, LLMResponse, LLMError } from '../types/llm';
import { callOpenAI, streamOpenAI } from './api/openaiClient';
import { OpenAIMessage } from './api/types';
import { MODEL, OPENAI_API_URL, TEMPERATURE, OPENAI_API_KEY } from './api/config';

// Define types for API responses
export interface ResponseChunk {
  type: string;
  output_index: number;
  content_index: number;
  item_id: string;
  delta?: string;
  text?: string;
  annotations?: any[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export class ChatService {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async getResponse(request: LLMRequest): Promise<LLMResponse> {
    return this.provider.getResponse(request);
  }

  async streamResponse(
    request: LLMRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void> {
    return this.provider.streamResponse(request, callbacks);
  }
}

/**
 * Get a chat completion from OpenAI
 */
export const getChatCompletion = async (
  messages: OpenAIMessage[],
  responseFormat?: { type: string }
): Promise<string> => {
  const response = await callOpenAI(messages, responseFormat);
  return response.text;
};

/**
 * Stream a chat completion from OpenAI
 */
export const streamChatCompletion = async (
  messages: Array<{ role: string; content: string }>,
  callbacks: {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: LLMError) => void;
  }
): Promise<void> => {
  return streamOpenAI(messages, callbacks);
};

/**
 * Streams a response from OpenAI API
 * @param messages - Array of messages to send to the API
 * @param apiKey - OpenAI API key
 * @param callbacks - Callbacks for stream events
 * @param model - Model to use (defaults to gpt-4o)
 */
export const streamResponse = async (
  messages: ChatMessage[],
  apiKey: string,
  callbacks: StreamCallbacks,
  model: string = 'gpt-4o'
): Promise<void> => {
  const { onStart, onToken, onComplete, onError } = callbacks;
  
  try {
    // Notify start of stream
    onStart?.();
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData ? JSON.stringify(errorData) : 'Unknown error'
        }`
      );
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    try {
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages from buffer
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // Check for stream response end
            if (data === '[DONE]') {
              onComplete?.(fullResponse);
              return;
            }

            try {
              const parsed: ResponseChunk = JSON.parse(data);
              
              // Handle different event types
              if (parsed.type === 'response.output_text.delta') {
                const content = parsed.delta || '';
                if (content) {
                  fullResponse += content;
                  onToken?.(content);
                }
              } else if (parsed.type === 'response.output_text.done') {
                const content = parsed.text || '';
                if (content) {
                  fullResponse = content;
                  onToken?.(content);
                }
              }
            } catch (err) {
              // Silent error handling
            }
          }
        }
      }

      // Ensure response callback is triggered
      onComplete?.(fullResponse);
    } catch (err) {
      reader.cancel();
      throw err;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Gets a response from OpenAI API (non-streaming)
 * @param messages - Array of messages to send to the API
 * @param apiKey - OpenAI API key (optional, defaults to config value)
 * @param model - Model to use (defaults to gpt-4o)
 * @returns The AI response text
 */
export const getResponse = async (
  messages: ChatMessage[],
  apiKey: string = OPENAI_API_KEY,
  model: string = MODEL
): Promise<string> => {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: messages,
        temperature: TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData ? JSON.stringify(errorData) : 'Unknown error'
        }`
      );
    }

    const data = await response.json();
    return data.output[0].content[0].text;
  } catch (error) {
    throw error;
  }
}; 