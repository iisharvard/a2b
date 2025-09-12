import React, { createContext, useContext, ReactNode } from 'react';

// Define the logger interface with all expected methods
interface Logger {
  logPageVisit: (page: string, action: string, metadata?: any, caseId?: string) => Promise<void>;
  logFramework: (framework: string, action: string, metadata?: any, caseId?: string | null) => Promise<void>;
  logParty: (party: string, action: string, metadata?: any) => Promise<void>;
  logCaseFile: (fileName: string, fileType: string, fileSize: number) => Promise<void>;
  getCaseId: (createIfNeeded?: boolean) => string | null;
}

// Set up the context type
interface LoggingContextType {
  logger: Logger | null;
  isLoggingInitialized: boolean;
}

// Create stub logger with no-op methods
const stubLogger: Logger = {
  logPageVisit: async () => {},
  logFramework: async () => {},
  logParty: async () => {},
  logCaseFile: async () => {},
  getCaseId: () => null,
};

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
export const useLogging = (): LoggingContextType => {
  return useContext(LoggingContext);
};