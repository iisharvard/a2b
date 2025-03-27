import { useState, useCallback } from 'react';
import { LLMRequest, LLMResponse, LLMError, LLMRole } from '../types/llm';
import { ChatService } from '../services/chatService';

export function useChatState(chatService: ChatService) {
  const [messages, setMessages] = useState<LLMRequest['messages']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LLMError | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    const newMessage = { role: 'user' as LLMRole, content };
    setMessages((prev) => [...prev, newMessage]);

    try {
      const response = await chatService.getResponse({
        messages: [...messages, newMessage],
      });

      setMessages((prev) => [...prev, { role: 'assistant' as LLMRole, content: response.content }]);
    } catch (err) {
      setError(err as LLMError);
    } finally {
      setIsLoading(false);
    }
  }, [chatService, messages]);

  const streamMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    const newMessage = { role: 'user' as LLMRole, content };
    setMessages((prev) => [...prev, newMessage]);

    let assistantMessage = { role: 'assistant' as LLMRole, content: '' };

    try {
      await chatService.streamResponse(
        {
          messages: [...messages, newMessage],
        },
        {
          onToken: (token) => {
            assistantMessage.content += token;
            setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err);
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      setError(err as LLMError);
      setIsLoading(false);
    }
  }, [chatService, messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    streamMessage,
  };
} 