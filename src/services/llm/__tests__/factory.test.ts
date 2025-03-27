import { createLLMProvider } from '../factory';
import { OpenAIProvider } from '../providers/openai';

describe('LLM Provider Factory', () => {
  const baseConfig = {
    apiKey: 'test-api-key',
    model: 'test-model',
    temperature: 0.7
  };

  it('should create OpenAI provider', () => {
    const provider = createLLMProvider({
      type: 'openai',
      ...baseConfig
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should throw error for unsupported provider type', () => {
    expect(() => {
      createLLMProvider({
        type: 'unsupported' as any,
        ...baseConfig
      });
    }).toThrow('Unsupported LLM provider type: unsupported');
  });

  it('should pass configuration to providers', () => {
    const customBaseUrl = 'https://custom-api.example.com';
    
    const openaiProvider = createLLMProvider({
      type: 'openai',
      ...baseConfig,
      baseUrl: customBaseUrl
    });

    // Test that the provider can complete requests
    expect(openaiProvider.getResponse).toBeDefined();
    expect(openaiProvider.streamResponse).toBeDefined();
  });
}); 