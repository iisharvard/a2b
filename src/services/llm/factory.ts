import { LLMProvider } from '../../types/llm';
import { OpenAIProvider } from './providers/openai';

export type LLMProviderType = 'openai';

export interface LLMProviderConfig {
  type: LLMProviderType;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        temperature: config.temperature
      });
    default:
      throw new Error(`Unsupported LLM provider type: ${config.type}`);
  }
} 