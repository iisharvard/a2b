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
type LanguageModelOptions = {
  modelName?: string;
};

const JSON_REQUIREMENTS = `CRITICAL JSON REQUIREMENTS:
1. Your response MUST be ONLY valid JSON - no text before or after
2. Do NOT wrap the JSON in markdown code blocks (\`\`\`)
3. Start your response with { and end with }
4. Properly escape ALL quotes inside string values using backslash (\\")
5. Example: "The \"example\" text" is correct, "The "example" text" is wrong
6. Return ONLY the JSON object, nothing else`;

const buildSystemPrompt = (promptContent: string): string => (
  `${promptContent}\n\n${JSON_REQUIREMENTS}`
);

const buildMessages = (systemPrompt: string, inputs: Record<string, unknown>): OpenAIMessage[] => ([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: JSON.stringify(inputs) }
]);

const shouldUseGemini = (options: LanguageModelOptions): boolean => (
  PROCESSING_MODEL === GEMINI_MODEL_NAME || Boolean(options.modelName)
);

const invokeLanguageModel = async (
  messages: OpenAIMessage[],
  options: LanguageModelOptions
) => {
  if (shouldUseGemini(options)) {
    console.log('📤 Sending request to Gemini...');
    console.log('📤 Messages being sent:', JSON.stringify(messages, null, 2));
    console.log('📤 System prompt length:', messages[0]?.content?.length);
    console.log('📤 User input length:', messages[1]?.content?.length);
    const response = await callGemini(messages, { type: 'json_object' }, undefined, undefined, options.modelName);
    console.log('📥 Received response from Gemini:', response);
    console.log('📥 Response text type:', typeof response.text);
    console.log('📥 Response text length:', response.text?.length);
    return response;
  }

  console.log('📤 Sending request to OpenAI...');
  const response = await callOpenAI(messages, { type: 'json_object' });
  console.log('📥 Received response from OpenAI:', response);
  console.log('📥 Response text type:', typeof response.text);
  console.log('📥 Response text length:', response.text?.length);
  return response;
};

const parseModelResponse = (response: any, promptFile: string) => {
  const raw = response?.text;

  if (typeof raw === 'object' && raw !== null) {
    console.log('✅ Response already parsed as object:', raw);
    return raw;
  }

  if (typeof raw !== 'string') {
    throw new Error('Invalid response format');
  }

  console.log('Response text first 500 chars:', raw.substring(0, 500));

  let textToParse = raw;
  if (raw.includes('```')) {
    textToParse = cleanMarkdownCodeBlocks(raw);
    console.log('Cleaned markdown blocks from response');
  }

  try {
    const parsedResponse = JSON.parse(textToParse);
    console.log('✅ Successfully parsed LLM response');
    if (parsedResponse === null || typeof parsedResponse !== 'object') {
      throw new SyntaxError('Parsed value must be a JSON object or array');
    }
    return validateResponse(promptFile, parsedResponse);
  } catch (error) {
    console.error('❌ Error parsing JSON response:', error);
    console.error('Raw response text length:', raw.length);
    console.error('Response type:', typeof raw);

    if (error instanceof SyntaxError) {
      const errorAnalysis = analyzeJsonError(raw, error);
      if (errorAnalysis) {
        console.error('Error at position:', errorAnalysis.position);
        console.error('Context around error:');
        console.error(errorAnalysis.context);
        console.error('Character at error position:', raw.charCodeAt(errorAnalysis.position), `(${errorAnalysis.char})`);
        console.error('Before error:', JSON.stringify(errorAnalysis.before));
        console.error('After error:', JSON.stringify(errorAnalysis.after));
      }

      const fixResult = fixMalformedJson(raw, error);
      if (fixResult.fixed) {
        try {
          const parsed = JSON.parse(fixResult.content);
          console.log(`✅ Successfully fixed JSON using ${fixResult.method} method`);
          if (parsed === null || typeof parsed !== 'object') {
            throw new SyntaxError('Parsed value must be a JSON object or array');
          }
          return validateResponse(promptFile, parsed);
        } catch (parseError) {
          console.error('Fixed JSON still failed to parse:', parseError);
        }
      } else {
        console.error('Could not fix malformed JSON');
      }
    }

    throw new Error('Invalid response format');
  }
};

export const callLanguageModel = async (
  promptFile: string,
  inputs: Record<string, any>,
  options: LanguageModelOptions = {}
): Promise<any> => {
  try {
    console.log('🤖 Calling language model with prompt:', promptFile);
    console.log('📝 Input keys:', Object.keys(inputs));
    console.log('📝 Input sizes:', Object.entries(inputs).map(([key, value]) => 
      `${key}: ${typeof value === 'string' ? value.length : JSON.stringify(value).length} chars`
    ));
    
    // Read the prompt file
    const promptContent = await readPromptFile(promptFile);
    const systemPrompt = buildSystemPrompt(promptContent);
    const messages = buildMessages(systemPrompt, inputs);

    const response = await invokeLanguageModel(messages, options);
    return parseModelResponse(response, promptFile);
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
