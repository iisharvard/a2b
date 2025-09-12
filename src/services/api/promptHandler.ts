import { callOpenAI, callGemini } from './llmClient';
import { OpenAIMessage } from './types';
import { PROCESSING_MODEL, GEMINI_MODEL_NAME } from './config';
import { validateResponse } from './schemas';
import { fixMalformedJson, cleanMarkdownCodeBlocks, analyzeJsonError } from './jsonFixer';

/**
 * Read a prompt file from the public/prompts directory
 * @param fileName Name of the prompt file
 * @returns Promise that resolves with the content of the prompt file
 */
export const readPromptFile = async (fileName: string): Promise<string> => {
  console.log('📄 Reading prompt file:', fileName);
  try {
    // Check if we're in a Node.js environment (Jest tests)
    if (typeof fetch === 'undefined' && typeof require !== 'undefined') {
      // In Node.js environment - read from filesystem
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../public/prompts', fileName);
      console.log('📁 Reading from filesystem:', filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log('✅ Successfully loaded prompt from filesystem:', fileName);
      return content;
    } else {
      // In browser environment - use fetch
      const response = await fetch(`/prompts/${fileName}`);
      if (!response.ok) {
        console.error('❌ Failed to read prompt file:', fileName, 'Status:', response.status);
        throw new Error(`Failed to read prompt file: ${fileName}`);
      }
      console.log('✅ Successfully loaded prompt:', fileName);
      return await response.text();
    }
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
    console.log('📝 Input keys:', Object.keys(inputs));
    console.log('📝 Input sizes:', Object.entries(inputs).map(([key, value]) => 
      `${key}: ${typeof value === 'string' ? value.length : JSON.stringify(value).length} chars`
    ));
    
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    
    // Add instructions to return JSON
    const systemPrompt = `${promptContent}\n\nIMPORTANT: Your response MUST be valid JSON. Make sure to properly escape any quotes (") inside string values by using backslash (\\"). For example, if you need to include the phrase "example" inside a string, it should be \\"example\\".`;
    
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
      console.log('📤 Messages being sent:', JSON.stringify(messages, null, 2));
      console.log('📤 System prompt length:', messages[0]?.content?.length);
      console.log('📤 User input length:', messages[1]?.content?.length);
      response = await callGemini(messages, { type: 'json_object' });
      console.log('📥 Received response from Gemini:', response);
      console.log('📥 Response text type:', typeof response.text);
      console.log('📥 Response text length:', response.text?.length);
    } else {
      console.log('📤 Sending request to OpenAI...');
      response = await callOpenAI(messages, { type: 'json_object' });
      console.log('📥 Received response from OpenAI:', response);
      console.log('📥 Response text type:', typeof response.text);
      console.log('📥 Response text length:', response.text?.length);
    }
    
    // Try to parse the response as JSON
    try {
      // The underlying LLM clients (callGemini with responseMimeType: 'application/json' 
      // and callOpenAI with responseFormat: { type: 'json_object' })
      // are now expected to return clean JSON directly.
      
      // Check if response.text is already an object (some APIs return parsed JSON)
      if (typeof response.text === 'object' && response.text !== null) {
        console.log('✅ Response already parsed as object:', response.text);
        return response.text;
      }
      
      // Log first 500 chars to debug
      console.log('Response text first 500 chars:', response.text.substring(0, 500));
      
      // Clean markdown code blocks
      const cleanedText = cleanMarkdownCodeBlocks(response.text);
      
      // Try to parse the cleaned response
      const parsedResponse = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed LLM response');
      
      // Validate against schema
      const validatedResponse = validateResponse(promptFile, parsedResponse);
      return validatedResponse;
    } catch (e) {
      console.error('❌ Error parsing JSON response:', e);
      console.error('Raw response text length:', response.text.length);
      console.error('Response type:', typeof response.text);
      
      // Analyze the error if it's a JSON syntax error
      if (e instanceof SyntaxError) {
        const errorAnalysis = analyzeJsonError(response.text, e);
        if (errorAnalysis) {
          console.error('Error at position:', errorAnalysis.position);
          console.error('Context around error:');
          console.error(errorAnalysis.context);
          console.error('Character at error position:', response.text.charCodeAt(errorAnalysis.position), `(${errorAnalysis.char})`);
          console.error('Before error:', JSON.stringify(errorAnalysis.before));
          console.error('After error:', JSON.stringify(errorAnalysis.after));
        }
      }
      
      // Try to fix malformed JSON
      if (e instanceof SyntaxError) {
        const fixResult = fixMalformedJson(response.text, e);
        
        if (fixResult.fixed) {
          try {
            const parsed = JSON.parse(fixResult.content);
            console.log(`✅ Successfully fixed JSON using ${fixResult.method} method`);
            
            // Validate against schema
            const validatedResponse = validateResponse(promptFile, parsed);
            return validatedResponse;
          } catch (parseError) {
            console.error('Fixed JSON still failed to parse:', parseError);
          }
        } else {
          console.error('Could not fix malformed JSON');
        }
      }
      
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