import { LLMProvider, LLMRequest, LLMResponse, LLMError } from '../../../../types/llm';

class MockLLMProvider implements LLMProvider {
  async getResponse(request: LLMRequest): Promise<LLMResponse> {
    return {
      content: 'Mock response',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    };
  }

  async streamResponse(
    request: LLMRequest,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: LLMError) => void;
    }
  ): Promise<void> {
    callbacks.onToken('Mock');
    callbacks.onToken(' stream');
    callbacks.onToken(' response');
    callbacks.onComplete();
  }
}

describe('LLMProvider', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  describe('getResponse', () => {
    it('should return a mock response', async () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getResponse(request);
      expect(response.content).toBe('Mock response');
      expect(response.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });
    });
  });

  describe('streamResponse', () => {
    it('should stream mock tokens and complete', async () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const tokens: string[] = [];
      let completed = false;
      let error: LLMError | undefined;

      await provider.streamResponse(request, {
        onToken: (token) => tokens.push(token),
        onComplete: () => (completed = true),
        onError: (err) => (error = err),
      });

      expect(tokens).toEqual(['Mock', ' stream', ' response']);
      expect(completed).toBe(true);
      expect(error).toBeUndefined();
    });
  });
}); 