import { getSessionId, setSessionId } from './session';
import { getStoredSessionId, saveSessionId } from './storage';

/**
 * Initializes the application with required setup
 * - Sets up session ID management
 * - Potentially other initialization in the future
 */
export const initializeApp = (): void => {
  console.log('Initializing app...');
  
  // Session ID initialization
  const storedSessionId = getStoredSessionId();
  if (storedSessionId) {
    // If we have a stored session ID, use it
    console.log('Using stored session ID:', storedSessionId);
    setSessionId(storedSessionId);
  } else {
    // Otherwise generate and store a new one
    const newSessionId = getSessionId(); // This generates a new one internally
    saveSessionId(newSessionId);
    console.log('Generated and stored new session ID:', newSessionId);
  }
};

/**
 * Function to be called when you explicitly want to start a new session
 * This regenerates the session ID and updates storage
 */
export const startNewSession = (): string => {
  // Can add any other reset logic needed here
  const newSessionId = getSessionId();
  saveSessionId(newSessionId);
  console.log('Started new session with ID:', newSessionId);
  return newSessionId;
}; 