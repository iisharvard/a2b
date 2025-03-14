import { readPromptFile, callLanguageModel } from '../promptHandler';
import { callOpenAI } from '../openaiClient';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock callOpenAI
jest.mock('../openaiClient', () => ({
  callOpenAI: jest.fn()
}));
const mockCallOpenAI = callOpenAI as jest.Mock;

describe('Prompt Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readPromptFile', () => {
    test('should fetch and return prompt file content', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('Prompt content')
      });

      // Call readPromptFile
      const result = await readPromptFile('test.txt');

      // Check that fetch was called with the correct URL
      expect(mockFetch).toHaveBeenCalledWith('/prompts/test.txt');

      // Check that the result is correct
      expect(result).toBe('Prompt content');
    });

    test('should throw error if fetch fails', async () => {
      // Mock failed fetch response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      // Expect readPromptFile to throw an error
      await expect(readPromptFile('nonexistent.txt')).rejects.toThrow('Failed to read prompt file');
    });

    test('should throw error if fetch throws', async () => {
      // Mock fetch throwing an error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Expect readPromptFile to throw an error
      await expect(readPromptFile('test.txt')).rejects.toThrow('Failed to read prompt file');
    });
  });

  describe('callLanguageModel', () => {
    test('should call OpenAI with prompt and return parsed JSON response', async () => {
      // Mock readPromptFile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('You are a helpful assistant.')
      });

      // Mock callOpenAI
      mockCallOpenAI.mockResolvedValueOnce('{"result": "success"}');

      // Call callLanguageModel
      const result = await callLanguageModel('test.txt', { input: 'test' });

      // Check that readPromptFile was called
      expect(mockFetch).toHaveBeenCalledWith('/prompts/test.txt');

      // Check that callOpenAI was called with the correct arguments
      expect(mockCallOpenAI).toHaveBeenCalledWith([
        { role: 'system', content: 'You are a helpful assistant.\n\nIMPORTANT: Your response MUST be valid JSON.' },
        { role: 'user', content: '{"input":"test"}' }
      ]);

      // Check that the result is correct
      expect(result).toEqual({ result: 'success' });
    });

    test('should handle rate limited response', async () => {
      // Mock readPromptFile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('You are a helpful assistant.')
      });

      // Mock callOpenAI returning rate limited flag
      mockCallOpenAI.mockResolvedValueOnce({ rateLimited: true });

      // Call callLanguageModel
      const result = await callLanguageModel('test.txt', { input: 'test' });

      // Check that the result is the rate limited flag
      expect(result).toEqual({ rateLimited: true });
    });

    test('should handle invalid JSON response', async () => {
      // Mock readPromptFile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('You are a helpful assistant.')
      });

      // Mock callOpenAI returning invalid JSON
      mockCallOpenAI.mockResolvedValueOnce('Invalid JSON');

      // Call callLanguageModel
      const result = await callLanguageModel('test.txt', { input: 'test' });

      // Check that the result contains the raw content
      expect(result).toEqual({ rawContent: 'Invalid JSON' });
    });

    test('should handle errors in callOpenAI', async () => {
      // Mock readPromptFile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('You are a helpful assistant.')
      });

      // Mock callOpenAI throwing an error
      mockCallOpenAI.mockRejectedValueOnce(new Error('API error'));

      // Expect callLanguageModel to throw an error
      await expect(callLanguageModel('test.txt', { input: 'test' })).rejects.toThrow('Failed to get response from language model');
    });
  });
}); 