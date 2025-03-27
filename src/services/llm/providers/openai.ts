import axios from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, LLMError } from '../../../types/llm';
import { OPENAI_API_URL, OPENAI_API_KEY, MODEL, TEMPERATURE } from '../../api/config';
import { callOpenAI, streamOpenAI } from '../../api/openaiClient';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private temperature: number;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || MODEL;
    this.temperature = config.temperature ?? TEMPERATURE;
  }

  async getResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await callOpenAI(
        request.messages, 
        request.responseFormat,
        request.temperature ?? this.temperature,
        this.apiKey
      );
      return {
        content: response.text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async streamResponse(
    request: LLMRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void> {
    try {
      await streamOpenAI(
        request.messages, 
        callbacks,
        request.temperature ?? this.temperature,
        this.apiKey
      );
    } catch (error: any) {
      callbacks.onError(this.handleError(error));
    }
  }

  private handleError(error: any): LLMError {
    // If the error is already in the correct format, return it
    if (error.code === 'API_ERROR' && error.status && typeof error.retryAfter !== 'undefined') {
      return error;
    }

    // Handle API errors (when we have a response)
    if (error.response) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'] || '0', 10);
      const errorMessage = error.response.data?.error?.message || 'API Error';
      
      return {
        code: 'API_ERROR',
        message: errorMessage,
        status: error.response.status,
        retryAfter
      };
    }

    // Handle network errors (when we have a request but no response)
    if (error.request || error.message === 'Network error when calling OpenAI API') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        status: 0,
        retryAfter: 0
      };
    }

    // Handle authentication errors
    if (error.message === 'OpenAI API authentication failed') {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        status: 401,
        retryAfter: 0
      };
    }

    // Handle bad request errors
    if (error.message === 'Invalid request to OpenAI API') {
      return {
        code: 'BAD_REQUEST',
        message: 'Invalid request',
        status: 400,
        retryAfter: 0
      };
    }

    // Handle other errors
    return {
      code: 'API_ERROR',
      message: error.message || 'API Error',
      status: error.response?.status || 500,
      retryAfter: parseInt(error.response?.headers?.['retry-after'] || '0', 10)
    };
  }

  private getRetryAfterValue(error: { headers: { get: (name: string) => string | null } }): number {
    const retryAfterHeader = error.headers.get('retry-after');
    if (retryAfterHeader) {
      const retryAfter = parseInt(retryAfterHeader);
      return isNaN(retryAfter) ? 0 : retryAfter;
    }
    return 0;
  }
} 