export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  responseFormat?: { type: string };
  tools?: any[];
  toolChoice?: string | object;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
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
  getResponse(request: LLMRequest): Promise<LLMResponse>;
  streamResponse(
    request: LLMRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void>;
} 