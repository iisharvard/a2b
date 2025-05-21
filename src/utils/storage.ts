// Local storage keys
const STORAGE_KEYS = {
  CHAT_HISTORY: 'a2b_chat_history',
  INTERFACE_STATE: 'a2b_interface_state',
  SESSION_ID: 'a2b_session_id',
};

// Type definitions for stored data
export interface StoredChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: number;
}

// Generic interface state - extend or modify based on your actual interface needs
export interface StoredInterfaceState {
  framework?: 'IoA' | 'Iceberg' | 'Redline';
  lastInput?: string;
  lastOutput?: string;
  // Add other fields as needed
}

/**
 * Saves chat history to local storage
 */
export const saveChatHistory = (chatHistory: StoredChatMessage[]): void => {
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatHistory));
};

/**
 * Retrieves chat history from local storage
 * Returns an empty array if no history is found
 */
export const getChatHistory = (): StoredChatMessage[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as StoredChatMessage[];
  } catch (e) {
    console.error('Error parsing chat history:', e);
    return [];
  }
};

/**
 * Clears chat history from local storage
 */
export const clearChatHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  console.log('Chat history cleared from local storage');
};

/**
 * Saves interface state to local storage
 */
export const saveInterfaceState = (state: StoredInterfaceState): void => {
  localStorage.setItem(STORAGE_KEYS.INTERFACE_STATE, JSON.stringify(state));
};

/**
 * Retrieves interface state from local storage
 * Returns null if no state is found
 */
export const getInterfaceState = (): StoredInterfaceState | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.INTERFACE_STATE);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as StoredInterfaceState;
  } catch (e) {
    console.error('Error parsing interface state:', e);
    return null;
  }
};

/**
 * Clears interface state from local storage
 */
export const clearInterfaceState = (): void => {
  localStorage.removeItem(STORAGE_KEYS.INTERFACE_STATE);
  console.log('Interface state cleared from local storage');
};

/**
 * Saves session ID to local storage
 */
export const saveSessionId = (sessionId: string): void => {
  localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
};

/**
 * Retrieves session ID from local storage
 * Returns null if no session ID is found
 */
export const getStoredSessionId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.SESSION_ID);
};

/**
 * Clears all app-related data from local storage
 */
export const clearAllStorage = (): void => {
  // Clear all localStorage items completely instead of just the predefined keys
  localStorage.clear();
  console.log('All app data completely cleared from local storage');
}; 