// Session ID management
let currentSessionId: string | null = null;

/**
 * Generates or retrieves the current session ID.
 * Called when the app loads to establish a consistent session ID.
 */
export const getSessionId = (): string => {
  if (!currentSessionId) {
    // Generate a new UUID for this session
    currentSessionId = crypto.randomUUID();
    console.log('Generated new session ID:', currentSessionId);
  }
  return currentSessionId;
};

/**
 * Explicitly sets the session ID.
 * This would be used when restoring from localStorage, etc.
 */
export const setSessionId = (sessionId: string): void => {
  currentSessionId = sessionId;
};

/**
 * Regenerates the session ID.
 * This would be used when explicitly starting a new session.
 */
export const regenerateSessionId = (): string => {
  currentSessionId = crypto.randomUUID();
  console.log('Regenerated session ID:', currentSessionId);
  return currentSessionId;
}; 