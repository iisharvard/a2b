import { callOpenAI, callGemini } from './llmClient';
import { OpenAIMessage } from './types';
import { PROCESSING_MODEL, GEMINI_MODEL_NAME } from './config';

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
    console.log('📝 Inputs:', JSON.stringify(inputs, null, 2));
    
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    
    // Add instructions to return JSON
    const systemPrompt = `${promptContent}\n\nIMPORTANT: Your response MUST be valid JSON.`;
    
    // Prepare messages for the LLM
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(inputs) }
    ];
    
    let response;
    // Check which model to use (this is a simple way, could be more sophisticated)
    // For now, we assume if PROCESSING_MODEL is GEMINI_MODEL_NAME, we use Gemini.
    if (PROCESSING_MODEL === GEMINI_MODEL_NAME) {
      console.log('📤 Sending request to Gemini...');
      response = await callGemini(messages, { type: 'json_object' });
      console.log('📥 Received response from Gemini:', response);
    } else {
      console.log('📤 Sending request to OpenAI...');
      response = await callOpenAI(messages, { type: 'json_object' });
      console.log('📥 Received response from OpenAI:', response);
    }
    
    // Try to parse the response as JSON
    try {
      // The underlying LLM clients (callGemini with responseMimeType: 'application/json' 
      // and callOpenAI with responseFormat: { type: 'json_object' })
      // are now expected to return clean JSON directly.
      const parsedResponse = JSON.parse(response.text);
      console.log('✅ Successfully parsed LLM response:', parsedResponse);
      return parsedResponse;
    } catch (e) {
      console.error('❌ Error parsing JSON response:', e);
      console.error('Raw response text:', response.text);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('❌ Error calling language model:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error; // Let the caller handle the error
  }
}; 