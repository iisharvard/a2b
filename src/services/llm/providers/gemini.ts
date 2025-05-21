import { LLMProvider, LLMRequest, LLMResponse, LLMError, LLMMessage } from '../../../types/llm';
import { GEMINI_API_KEY, GEMINI_MODEL_NAME, TEMPERATURE } from '../../api/config';
import { callGemini, streamGemini } from '../../api/llmClient'; // We'll use the functions from llmClient

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private temperature: number;

  constructor(config: {
    apiKey?: string; // Optional, will use default from config if not provided
    model?: string;
    temperature?: number;
  }) {
    this.apiKey = config.apiKey || GEMINI_API_KEY;
    this.model = config.model || GEMINI_MODEL_NAME;
    this.temperature = config.temperature ?? TEMPERATURE;
  }

  async getResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Ensure messages are in the OpenAIMessage format expected by callGemini
      const openAIMessages: Array<{role: string, content: string}> = request.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await callGemini(
        openAIMessages,
        request.responseFormat,
        request.temperature ?? this.temperature,
        this.apiKey,
        this.model
      );
      return {
        content: response.text,
        // Gemini API might not return token usage in the same way or at all for basic calls.
        // Adjust if usage data becomes available and is needed.
        usage: response.usage ? {
          inputTokens: response.usage.input_tokens || 0,
          outputTokens: response.usage.output_tokens || 0,
          totalTokens: response.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error: any) {
      // The error from callGemini should already be in LLMError format
      if (this.isLLMError(error)) {
        throw error;
      }
      // Fallback for unexpected errors
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
      const openAIMessages: Array<{role: string, content: string}> = request.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      await streamGemini(
        openAIMessages,
        callbacks,
        request.temperature ?? this.temperature,
        this.apiKey,
        this.model
      );
    } catch (error: any) {
      // The error from streamGemini should be passed to onError callback which expects LLMError
      // If streamGemini throws directly (it shouldn't for handled errors), catch here.
      if (this.isLLMError(error)) {
        callbacks.onError(error);
      } else {
        callbacks.onError(this.handleError(error));
      }
    }
  }

  private isLLMError(error: any): error is LLMError {
    return error && typeof error.code === 'string' && typeof error.message === 'string';
  }

  // Simplified error handler as callGemini/streamGemini should provide LLMError formatted errors
  private handleError(error: any): LLMError {
    console.error("GeminiProvider encountered an unexpected error:", error);
    return {
      code: 'PROVIDER_ERROR',
      message: error.message || 'An unexpected error occurred in GeminiProvider',
      status: error.status || 500,
      retryAfter: 0
    };
  }
} 