import { useChatContext } from './ChatContextProvider';

/**
 * Hook for adding content to the chat context
 * This is a simplified version that maintains API compatibility
 */
export const useAddToChat = () => {
  const { addInterfaceContent } = useChatContext();
  
  return {
    /**
     * Add content to the chat context (no-op in this simplified version)
     */
    addToContext: (type: string, content: string) => {
      addInterfaceContent(type, content);
    }
  };
}; 