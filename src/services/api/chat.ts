import { callGemini } from './llmClient';
import { OpenAIMessage } from './types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are the negotiation assistant embedded in the A2B application. 
Help the user understand their negotiation strategy, analysis, and next steps. 
Reply with clear plain-language text. If you need additional information, ask follow-up questions.`;

export const sendChatMessage = async (
  conversation: ChatMessage[],
  contextText?: string
): Promise<string> => {
  const systemMessage = contextText
    ? `${SYSTEM_PROMPT}\n\nContext for this conversation:\n${contextText}`
    : SYSTEM_PROMPT;

  const history: OpenAIMessage[] = [
    { role: 'user', content: systemMessage },
    ...conversation.map(message => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const response = await callGemini(history);
  const text = response.text?.trim();

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return text;
};
