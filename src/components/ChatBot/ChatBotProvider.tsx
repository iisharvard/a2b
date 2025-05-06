import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { ChatBotWithState } from './ChatBotWithState';

// Create context for split-screen mode
const SplitScreenContext = createContext<boolean>(false);

// Export hook to use split-screen context
export const useSplitScreen = () => useContext(SplitScreenContext);

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
        <ChatBotWithState
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