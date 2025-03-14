import { callOpenAI } from './openaiClient';
import { OpenAIMessage } from './types';

/**
 * Read a prompt file from the public/prompts directory
 * @param fileName Name of the prompt file
 * @returns Promise that resolves with the content of the prompt file
 */
export const readPromptFile = async (fileName: string): Promise<string> => {
  try {
    const response = await fetch(`/prompts/${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to read prompt file: ${fileName}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error reading prompt file ${fileName}:`, error);
    throw new Error(`Failed to read prompt file: ${fileName}`);
  }
};

/**
 * Call the language model with a prompt file and inputs
 * @param promptFile Name of the prompt file
 * @param inputs Object containing inputs for the prompt
 * @returns Promise that resolves with the parsed JSON response or a rate limited flag
 */
export const callLanguageModel = async (promptFile: string, inputs: Record<string, any>): Promise<any> => {
  try {
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    
    // Add instructions to return JSON
    const systemPrompt = `${promptContent}\n\nIMPORTANT: Your response MUST be valid JSON.`;
    
    // Prepare messages for OpenAI
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(inputs) }
    ];
    
    // Call OpenAI API
    const responseContent = await callOpenAI(messages);
    
    // Check if we got a rate limit flag
    if (typeof responseContent !== 'string' && responseContent.rateLimited) {
      return { rateLimited: true };
    }
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(responseContent as string);
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      // If parsing fails, return the raw content
      return { rawContent: responseContent };
    }
  } catch (error) {
    console.error('Error calling language model:', error);
    throw new Error('Failed to get response from language model');
  }
}; 