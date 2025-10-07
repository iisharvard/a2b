import { callGemini } from './llmClient';
import { OpenAIMessage } from './types';
import { readPromptFile } from './promptHandler';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatActionType =
  | 'update_ioa'
  | 'update_iceberg'
  | 'update_components'
  | 'update_boundaries'
  | 'update_scenarios';

export interface ChatAction {
  type: ChatActionType;
  content?: string;
  data?: unknown;
}

export interface ChatResult {
  reply: string;
  actions?: ChatAction[];
}

export const sendChatMessage = async (
  conversation: ChatMessage[],
  contextText?: string
): Promise<ChatResult> => {
  const systemPrompt = await readPromptFile('chatAssistant.txt');
  const history: OpenAIMessage[] = [
    {
      role: 'user',
      content: contextText
        ? `${systemPrompt}\n\nCONTEXT:\n${contextText}`
        : systemPrompt
    },
    ...conversation.map(message => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const response = await callGemini(history, { type: 'json_object' });
  const text = typeof response.text === 'string' ? response.text.trim() : '';

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  let parsed: ChatResult;
  try {
    parsed = JSON.parse(text) as ChatResult;
  } catch (error) {
    console.error('Failed to parse chat response JSON:', error, text);
    throw new Error('Assistant returned invalid JSON format');
  }

  if (!parsed || typeof parsed.reply !== 'string') {
    throw new Error('Assistant response missing "reply" field');
  }

  if (parsed.actions) {
    parsed.actions = parsed.actions.filter(action => action && action.type) as ChatAction[];
  }

  return parsed;
};
