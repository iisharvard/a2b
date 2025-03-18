import { useChatContext } from './ChatContextProvider';

/**
 * Hook for adding content to the chat context
 * Use this in any component that generates content you want the chatbot to be aware of
 */
export const useAddToChat = () => {
  const { addInterfaceContent } = useChatContext();
  
  return {
    /**
     * Add content to the chat context
     * @param type The type of content (e.g., 'Report', 'Document', 'SearchResult')
     * @param content The actual content text
     */
    addToContext: (type: string, content: string) => {
      addInterfaceContent(type, content);
    }
  };
}; 