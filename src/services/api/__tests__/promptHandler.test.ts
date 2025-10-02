import { readPromptFile, callLanguageModel } from '../promptHandler';
import { callOpenAI, callGemini } from '../llmClient';
import * as schemas from '../schemas';
import * as jsonFixer from '../jsonFixer';

// Mock fetch and LLM clients
global.fetch = jest.fn();
jest.mock('../llmClient');
jest.mock('../config', () => ({
  PROCESSING_MODEL: 'gpt-3.5-turbo',
  GEMINI_MODEL_NAME: 'gemini-pro'
}));

describe('Prompt Handler', () => {
  const mockCallOpenAI = callOpenAI as jest.MockedFunction<typeof callOpenAI>;
  const mockCallGemini = callGemini as jest.MockedFunction<typeof callGemini>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readPromptFile', () => {
    test('should read prompt file successfully', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const content = await readPromptFile('test.txt');
      expect(content).toBe('You are a helpful assistant.');
      expect(global.fetch).toHaveBeenCalledWith('/prompts/test.txt');
    });

    test('should handle 404 error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(readPromptFile('nonexistent.txt')).rejects.toThrow('Failed to read prompt file: nonexistent.txt');
    });

    test('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(readPromptFile('test.txt')).rejects.toThrow('Failed to read prompt file: test.txt');
    });
  });

  describe('callLanguageModel', () => {
    test('should call OpenAI with prompt and return parsed JSON response', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock successful OpenAI response
      mockCallOpenAI.mockResolvedValueOnce({
        text: '{"result":"success"}',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30
        }
      });

      const result = await callLanguageModel('test.txt', { input: 'test' });

      expect(result).toEqual({ result: 'success' });
      expect(mockCallOpenAI).toHaveBeenCalledTimes(1);
      const [messages, responseFormat] = mockCallOpenAI.mock.calls[0];
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('CRITICAL JSON REQUIREMENTS:');
      expect(messages[0].content).toContain('Do NOT wrap the JSON in markdown code blocks');
      expect(messages[0].content).toContain('Properly escape ALL quotes inside string values using backslash');
      expect(messages[1]).toEqual({ role: 'user', content: '{"input":"test"}' });
      expect(responseFormat).toEqual({ type: 'json_object' });
    });

    test('should route calls to Gemini when modelName is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      mockCallGemini.mockResolvedValueOnce({
        text: '{"result":"gemini"}',
        usage: {
          input_tokens: 7,
          output_tokens: 14,
          total_tokens: 21
        }
      } as any);

      const result = await callLanguageModel('test.txt', { input: 'test' }, { modelName: 'gemini-pro' });

      expect(result).toEqual({ result: 'gemini' });
      expect(mockCallGemini).toHaveBeenCalled();
      expect(mockCallOpenAI).not.toHaveBeenCalled();
    });

    test('should return object responses without additional parsing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      mockCallOpenAI.mockResolvedValueOnce({
        text: { result: 'already-object' },
        usage: {
          input_tokens: 5,
          output_tokens: 6,
          total_tokens: 11
        }
      } as any);

      const result = await callLanguageModel('test.txt', { input: 'test' });
      expect(result).toEqual({ result: 'already-object' });
    });

    test('should handle rate limited response', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock rate limited response
      mockCallOpenAI.mockResolvedValueOnce({
        text: '{"rateLimited":true}',
        usage: {
          input_tokens: 5,
          output_tokens: 10,
          total_tokens: 15
        }
      });

      const result = await callLanguageModel('test.txt', { input: 'test' });
      expect(result).toEqual({ rateLimited: true });
    });

    test('should fix malformed JSON with unescaped quotes', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock response with unescaped quotes
      mockCallOpenAI.mockResolvedValueOnce({
        text: '{"result":"User said "hello" to the assistant"}',
        usage: {
          input_tokens: 5,
          output_tokens: 10,
          total_tokens: 15
        }
      });

      const result = await callLanguageModel('test.txt', { input: 'test' });
      // The JSON fixer should escape the quotes
      expect(result).toEqual({ result: 'User said "hello" to the assistant' });
    });

    test('should throw error for completely invalid JSON', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock completely invalid JSON response
      mockCallOpenAI.mockResolvedValueOnce({
        text: 'This is not JSON at all',
        usage: {
          input_tokens: 5,
          output_tokens: 10,
          total_tokens: 15
        }
      });

      await expect(callLanguageModel('test.txt', { input: 'test' })).rejects.toThrow('Invalid response format');
    });

    test('should handle OpenAI error', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock OpenAI error
      mockCallOpenAI.mockRejectedValueOnce(new Error('Failed to get response from language model'));

      await expect(callLanguageModel('test.txt', { input: 'test' })).rejects.toThrow('Failed to get response from language model');
    });
  });
}); 
