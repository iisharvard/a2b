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
  responseFormat?: { type: string },
  apiKey: string = OPENAI_API_KEY
): Promise<string> => {
  const response = await callOpenAI(messages, responseFormat, TEMPERATURE, apiKey);
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
  },
  model: string = MODEL
): Promise<void> => {
  return streamOpenAI(messages, callbacks, TEMPERATURE, OPENAI_API_KEY, true, model);
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
  apiKey: string = OPENAI_API_KEY,
  callbacks: StreamCallbacks,
  model: string = MODEL
): Promise<void> => {
  const { onStart, onToken, onComplete, onError } = callbacks;
  
  try {
    // Notify start of stream
    onStart?.();
    
    // Use the streamOpenAI function with the array format
    await streamOpenAI(
      messages,
      {
        onToken: (token) => onToken?.(token),
        onComplete: () => onComplete?.(''),
        onError: (error) => onError?.(error instanceof Error ? error : new Error(String(error)))
      },
      TEMPERATURE,
      apiKey,
      false, // Use array format instead of string format
      model
    );
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
    // Corrected call: pass TEMPERATURE then apiKey
    const response = await callOpenAI(messages, undefined, TEMPERATURE, apiKey);
    return response.text;
  } catch (error) {
    throw error;
  }
}; 