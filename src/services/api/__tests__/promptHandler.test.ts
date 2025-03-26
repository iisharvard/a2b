import { readPromptFile, callLanguageModel } from '../promptHandler';
import { callOpenAI } from '../openaiClient';

// Mock fetch and callOpenAI
global.fetch = jest.fn();
jest.mock('../openaiClient');

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
      mockCallOpenAI.mockResolvedValueOnce('{"result":"success"}');

      const result = await callLanguageModel('test.txt', { input: 'test' });

      expect(result).toEqual({ result: 'success' });
      expect(mockCallOpenAI).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are a helpful assistant.\n\nIMPORTANT: Your response MUST be valid JSON.' },
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
      mockCallOpenAI.mockResolvedValueOnce('{"rateLimited":true}');

      const result = await callLanguageModel('test.txt', { input: 'test' });
      expect(result).toEqual({ rateLimited: true });
    });

    test('should handle invalid JSON response', async () => {
      // Mock successful prompt file read
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('You are a helpful assistant.'),
      });

      // Mock invalid JSON response
      mockCallOpenAI.mockResolvedValueOnce('Invalid JSON');

      const result = await callLanguageModel('test.txt', { input: 'test' });
      expect(result).toEqual({
        error: 'Failed to parse JSON response',
        rawContent: 'Invalid JSON',
      });
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