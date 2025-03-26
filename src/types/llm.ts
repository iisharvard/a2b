export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: { type: string };
}

export interface LLMCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMError {
  code: string;
  message: string;
  status?: number;
  retryAfter?: number;
}

export interface LLMProvider {
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  streamComplete(
    request: LLMCompletionRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void>;
} 