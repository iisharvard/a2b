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
      expect(mockCallOpenAI).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are a helpful assistant.\n\nIMPORTANT: Your response MUST be valid JSON. Make sure to properly escape any quotes (") inside string values by using backslash (\\"). For example, if you need to include the phrase "example" inside a string, it should be \\"example\\".' },
          { role: 'user', content: '{"input":"test"}' }
        ],
        { type: 'json_object' }
      );
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