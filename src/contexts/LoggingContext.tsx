import React, { createContext, useContext, ReactNode } from 'react';

// Set up the context type
interface LoggingContextType {
  logger: null;
  isLoggingInitialized: boolean;
}

// Create the context with a default value
const LoggingContext = createContext<LoggingContextType>({
  logger: null,
  isLoggingInitialized: false,
});

interface LoggingProviderProps {
  children: ReactNode;
}

/**
 * Stub provider component - logging is disabled
 */
export const LoggingProvider: React.FC<LoggingProviderProps> = ({ children }) => {
  return (
    <LoggingContext.Provider value={{ logger: null, isLoggingInitialized: false }}>
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