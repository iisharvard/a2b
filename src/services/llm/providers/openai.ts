import axios from 'axios';
import { LLMProvider, LLMMessage, LLMCompletionRequest, LLMCompletionResponse, LLMError } from '../../../types/llm';
import { Response } from 'node-fetch';
import { TextDecoder } from 'util';
import { handleStreamError } from './utils';

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
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature ?? 0;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? this.temperature,
          max_tokens: request.maxTokens,
          response_format: request.responseFormat,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async streamComplete(
    request: LLMCompletionRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void> {
    try {
      console.log('Starting stream request');
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? this.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        console.log('Response not ok:', response.status);
        const error = await this.handleStreamError(response);
        callbacks.onError(error);
        return;
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
          if (done) {
            console.log('Stream done');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk);
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              console.log('Processing data:', data);
              if (data === '[DONE]') {
                console.log('Received [DONE]');
                callbacks.onComplete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                console.log('Parsed data:', parsed);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  console.log('Found content:', content);
                  callbacks.onToken(content);
                }
              } catch (e) {
                console.error('Error parsing data:', e);
              }
            }
          }
        }
        console.log('Stream complete');
        callbacks.onComplete();
      } catch (error) {
        console.error('Stream error:', error);
        callbacks.onError(this.handleError(error));
      }
    } catch (error: any) {
      console.error('Request error:', error);
      callbacks.onError(this.handleError(error));
    }
  }

  private handleError(error: any): LLMError {
    if (error.response) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '0');
      return {
        code: 'API_ERROR',
        message: error.response.data?.error?.message || 'API request failed',
        status: error.response.status,
        retryAfter,
      };
    }

    if (error.request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        status: 0,
      };
    }

    // Check if error is a Response-like object
    if (error && typeof error === 'object' && 'status' in error && 'headers' in error) {
      return {
        code: 'API_ERROR',
        message: error.message || `API request failed with status ${error.status}`,
        status: error.status,
        retryAfter: this.getRetryAfterValue(error),
      };
    }

    if (error instanceof Error) {
      return {
        code: 'API_ERROR',
        message: error.message,
        status: undefined,
        retryAfter: undefined,
      };
    }

    return {
      code: 'API_ERROR',
      message: error.message || 'An unknown error occurred',
      status: 500,
    };
  }

  private async handleStreamError(response: any): Promise<LLMError> {
    return handleStreamError(response);
  }

  private getRetryAfterValue(error: { headers: { get: (name: string) => string | null } }): number {
    const retryAfterHeader = error.headers.get('retry-after');
    if (retryAfterHeader) {
      const retryAfter = parseInt(retryAfterHeader);
      if (!isNaN(retryAfter) && retryAfter > 0) {
        return retryAfter;
      }
    }
    return 0;
  }
} 