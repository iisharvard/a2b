import React, { ReactNode, useContext } from 'react';
// Import directly from the file to avoid circular dependencies
import { ChatBot } from './ChatBot';

// Create a context to track if we're using split-screen mode
export const SplitScreenContext = React.createContext(false);

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
  useSplitScreen?: boolean;
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
  useSplitScreen = false,
}) => {
  return (
    <SplitScreenContext.Provider value={useSplitScreen}>
      {children}
      {/* Only render the ChatBot directly if we're not using split-screen mode */}
      {!useSplitScreen && (
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
      )}
    </SplitScreenContext.Provider>
  );
};

export default ChatBotProvider; 