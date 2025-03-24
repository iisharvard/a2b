import React, { createContext, useContext, ReactNode } from 'react';

// Context type definition
interface ChatContextType {
  // Placeholder for API compatibility
  interfaceContent: any[];
  addInterfaceContent: (type: string, content: string) => void;
  clearInterfaceContent: () => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Hook for using the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatContextProvider');
  }
  return context;
};

// Props for the provider component
interface ChatContextProviderProps {
  children: ReactNode;
}

// The provider component - simplified version that doesn't actually store context
export const ChatContextProvider: React.FC<ChatContextProviderProps> = ({ children }) => {
  // Return empty implementations for API compatibility
  return (
    <ChatContext.Provider
      value={{
        interfaceContent: [],
        addInterfaceContent: () => {}, // No-op function
        clearInterfaceContent: () => {}, // No-op function
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider; 