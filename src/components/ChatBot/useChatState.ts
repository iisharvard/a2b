import { useState, useRef, useEffect } from 'react';
import { ChatState, Message, ChatBotProps } from './types';
import { ChatMessage, streamResponse } from '../../services/chatService';

export const useChatState = (props: ChatBotProps) => {
  const {
    apiKey = import.meta.env.VITE_OPENAI_API_KEY || '',
    initialMessage,
    systemMessage = "You are a helpful assistant. Be concise and direct in your responses.",
  } = props;

  // Validate API key
  if (!apiKey) {
    console.error('No API key provided. Please provide an API key or set VITE_OPENAI_API_KEY in your environment.');
  }

  const [state, setState] = useState<ChatState>({
    isOpen: false,
    messages: [],
    inputValue: '',
    isTyping: false,
    conversation: [{ role: 'system', content: systemMessage }],
    isFirstOpen: true,
    currentStreamedMessage: null,
    streamingText: '',
  });

  // Update system message when it changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      conversation: [
        { role: 'system', content: systemMessage },
        ...prev.conversation.slice(1) // Keep all messages after the system message
      ]
    }));
  }, [systemMessage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, inputValue: e.target.value }));
  };

  // Handle token updates during streaming
  const handleToken = (token: string, messageId: string) => {
    setState(prev => {
      const newText = prev.streamingText + token;
      return {
        ...prev,
        streamingText: newText,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, text: newText } : msg
        )
      };
    });
  };

  // Toggle chat window
  const toggleChat = () => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  // Handle message submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { inputValue, conversation } = state;
    if (!inputValue.trim()) return;

    // Reset streaming text
    setState(prev => ({ ...prev, streamingText: '' }));

    // Generate message IDs
    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `bot-${Date.now()}`;

    // Create user message
    const userMessage: Message = {
      id: userMessageId,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    // Create initial bot message
    const initialBotMessage: Message = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };

    // Update state with new messages and clear input
    setState(prev => ({
      ...prev,
      inputValue: '',
      isTyping: true,
      messages: [...prev.messages, userMessage],
      currentStreamedMessage: initialBotMessage,
      conversation: [...prev.conversation, { role: 'user', content: inputValue }],
    }));

    try {
      let fullResponse = '';
      
      await streamResponse(
        [...conversation, { role: 'user', content: inputValue }],
        apiKey,
        {
          onToken: (token) => {
            // Only append the new token if it's not already in the response
            if (!fullResponse.endsWith(token)) {
              fullResponse += token;
              setState(prev => {
                const updatedMessage = {
                  ...prev.currentStreamedMessage!,
                  text: fullResponse,
                };
                return {
                  ...prev,
                  streamingText: fullResponse,
                  currentStreamedMessage: updatedMessage,
                };
              });
            }
          },
          onComplete: () => {
            setState(prev => {
              const botMessage: Message = {
                id: botMessageId,
                text: fullResponse,
                sender: 'bot',
                timestamp: new Date(),
              };

              // Check if the message already exists
              const messageExists = prev.messages.some(msg => msg.id === botMessageId);

              return {
                ...prev,
                isTyping: false,
                currentStreamedMessage: null,
                conversation: [...prev.conversation, { role: 'assistant', content: fullResponse }],
                messages: messageExists ? prev.messages : [...prev.messages, botMessage],
              };
            });
          },
          onError: (error) => {
            throw error;
          }
        }
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        isTyping: false,
        currentStreamedMessage: null,
        messages: [
          ...prev.messages,
          {
            id: `error-${Date.now()}`,
            text: 'Sorry, I encountered an error. Please try again.',
            sender: 'bot',
            timestamp: new Date(),
          }
        ],
      }));
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.currentStreamedMessage]);

  // Focus input when chat opens
  useEffect(() => {
    if (state.isOpen) {
      inputRef.current?.focus();
      
      if (state.isFirstOpen && initialMessage) {
        setState(prev => ({
          ...prev,
          isFirstOpen: false,
          messages: [
            {
              id: 'bot-initial',
              text: initialMessage,
              sender: 'bot',
              timestamp: new Date(),
            },
          ],
        }));
      }
    }
  }, [state.isOpen, state.isFirstOpen, initialMessage]);

  return {
    state,
    refs: { messagesEndRef, inputRef },
    handlers: {
      handleInputChange,
      handleSubmit,
      handleKeyPress,
      toggleChat,
    }
  };
}; 