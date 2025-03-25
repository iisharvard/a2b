import { callOpenAI } from './openaiClient';
import { OpenAIMessage } from './types';

/**
 * Read a prompt file from the public/prompts directory
 * @param fileName Name of the prompt file
 * @returns Promise that resolves with the content of the prompt file
 */
export const readPromptFile = async (fileName: string): Promise<string> => {
  console.log('📄 Reading prompt file:', fileName);
  try {
    const response = await fetch(`/prompts/${fileName}`);
    if (!response.ok) {
      console.error('❌ Failed to read prompt file:', fileName, 'Status:', response.status);
      throw new Error(`Failed to read prompt file: ${fileName}`);
    }
    console.log('✅ Successfully loaded prompt:', fileName);
    return await response.text();
  } catch (error) {
    console.error('❌ Error reading prompt file:', fileName, error);
    throw new Error(`Failed to read prompt file: ${fileName}`);
  }
};

/**
 * Call the language model with a prompt file and inputs
 * @param promptFile Name of the prompt file
 * @param inputs Object containing inputs for the prompt
 * @returns Promise that resolves with the parsed JSON response
 */
export const callLanguageModel = async (promptFile: string, inputs: Record<string, any>): Promise<any> => {
  try {
    console.log('🤖 Calling language model with prompt:', promptFile);
    console.log('Inputs:', inputs);
    
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    
    // Add instructions to return JSON
    const systemPrompt = `${promptContent}\n\nIMPORTANT: Your response MUST be valid JSON.`;
    
    // Prepare messages for OpenAI
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(inputs) }
    ];
    
    console.log('Sending request to OpenAI...');
    // Call OpenAI API with JSON response format
    const responseContent = await callOpenAI(messages, { type: 'json_object' });
    
    // Try to parse the response as JSON
    try {
      const parsedResponse = JSON.parse(responseContent);
      console.log('✅ Successfully parsed OpenAI response:', parsedResponse);
      return parsedResponse;
    } catch (e) {
      console.error('❌ Error parsing JSON response:', e);
      // If parsing fails, return the raw content
      return { error: 'Failed to parse JSON response', rawContent: responseContent };
    }
  } catch (error) {
    console.error('❌ Error calling language model:', error);
    throw error; // Let the caller handle the error
  }
}; 