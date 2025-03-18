import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

// Interface for stored content
export interface InterfaceContent {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
}

// Context type definition
interface ChatContextType {
  interfaceContent: InterfaceContent[];
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

// The provider component
export const ChatContextProvider: React.FC<ChatContextProviderProps> = ({ children }) => {
  const [interfaceContent, setInterfaceContent] = useState<InterfaceContent[]>([]);
  const contentTracker = useRef<Map<string, string>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Debounced add content function with duplicate checking
  const addInterfaceContent = useCallback((type: string, content: string) => {
    // Create a key for this type of content
    const contentKey = `${type}`;
    
    // Clear existing timer for this content type if it exists
    if (debounceTimers.current.has(contentKey)) {
      clearTimeout(debounceTimers.current.get(contentKey));
      debounceTimers.current.delete(contentKey);
    }
    
    // Only proceed if content has changed for this type
    if (contentTracker.current.get(contentKey) !== content) {
      // Set a new timer
      const timer = setTimeout(() => {
        // When timer completes, update the content
        console.log(`Adding to context - Type: ${type}, Content:`, content);
        setInterfaceContent(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type,
            content,
            timestamp: new Date()
          }
        ]);
        
        // Update the content tracker
        contentTracker.current.set(contentKey, content);
        
        // Clean up the timer reference
        debounceTimers.current.delete(contentKey);
      }, 1000); // 1 second debounce
      
      // Store the timer reference
      debounceTimers.current.set(contentKey, timer);
    }
  }, []);

  // Clear all content
  const clearInterfaceContent = useCallback(() => {
    // Clear all timers
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();
    
    // Clear content tracker
    contentTracker.current.clear();
    
    // Clear content state
    setInterfaceContent([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        interfaceContent,
        addInterfaceContent,
        clearInterfaceContent,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider; 