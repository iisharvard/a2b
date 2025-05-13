import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { LoggingHelper } from '../utils/loggingHelper';
import { getSessionId } from '../utils/session';
import { initializeApp } from '../utils/appInit';

// Set up the context type
interface LoggingContextType {
  logger: LoggingHelper | null;
  isLoggingInitialized: boolean;
}

// Create the context with a default value
const LoggingContext = createContext<LoggingContextType>({
  logger: null,
  isLoggingInitialized: false,
});

interface LoggingProviderProps {
  children: ReactNode;
  db: Firestore;
  storage: FirebaseStorage;
  userId: string | null;
}

/**
 * Provider component that wraps the app and makes the logging helper available
 */
export const LoggingProvider: React.FC<LoggingProviderProps> = ({ 
  children, 
  db, 
  storage, 
  userId 
}) => {
  const [loggingState, setLoggingState] = useState<LoggingContextType>({
    logger: null,
    isLoggingInitialized: false,
  });

  // Initialize the app and logger when userId changes
  useEffect(() => {
    const initializeLogging = async () => {
      if (userId) {
        initializeApp();
        const loggerInstance = new LoggingHelper(db, storage, userId);
        
        // Set the logger in state FIRST
        setLoggingState({
          logger: loggerInstance,
          isLoggingInitialized: true,
        });
        
        // THEN attempt the initial log
        try {
          console.log(`Attempting initial app_root log for user: ${userId}, session: ${getSessionId()}`);
          await loggerInstance.logPageVisit(
            'app_root',
            'enter',
            undefined,
            'app_global' 
          );
          console.log('Initial app_root page visit logged successfully.');
        } catch (error) {
          console.error('Failed to log initial app_root page visit:', error);
          // Optionally, you could set isLoggingInitialized back to false or handle this state
        }
      } else {
        setLoggingState({
          logger: null,
          isLoggingInitialized: false,
        });
      }
    };

    initializeLogging();
    
    // Cleanup on unmount or userId change
    return () => {
      // Use loggingState.logger to ensure we are using the logger from the state
      if (loggingState.logger && userId) {
        console.log(`Attempting exit app_root log for user: ${userId}`);
        loggingState.logger.logPageVisit(
          'app_root',
          'exit',
          undefined,
          'app_global'
        ).catch(err => console.error('Error logging app exit:', err));
      }
    };
  }, [db, storage, userId]); // Removed loggingState from dependencies to avoid re-triggering on its own change

  return (
    <LoggingContext.Provider value={loggingState}>
      {children}
    </LoggingContext.Provider>
  );
};

/**
 * Custom hook to use the logging context
 */
export const useLogging = () => {
  return useContext(LoggingContext);
}; 