import React, { ReactNode } from 'react';
import ChatBot from './ChatBot';

interface ChatBotProviderProps {
  children: ReactNode;
  apiKey?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  botAvatar?: string;
  userAvatar?: string;
  initialMessage?: string;
  systemMessage?: string;
}

/**
 * Provider component that adds the ChatBot to all pages
 * Wrap your application with this component to make the ChatBot available throughout
 */
const ChatBotProvider: React.FC<ChatBotProviderProps> = ({
  children,
  apiKey,
  title,
  subtitle,
  primaryColor,
  botAvatar,
  userAvatar,
  initialMessage,
  systemMessage,
}) => {
  return (
    <>
      {children}
      <ChatBot
        apiKey={apiKey}
        title={title}
        subtitle={subtitle}
        primaryColor={primaryColor}
        botAvatar={botAvatar}
        userAvatar={userAvatar}
        initialMessage={initialMessage}
        systemMessage={systemMessage}
      />
    </>
  );
};

export default ChatBotProvider; 