import React, { useEffect, useState } from 'react';
import { useLogging } from '../contexts/LoggingContext';
import ClearButtons from '../components/ClearButtons';

interface LoggingExampleProps {
  // You would typically get these from your actual app component
  caseId?: string;
  caseContent?: string;
}

/**
 * Example component demonstrating how to use the logging system
 */
const LoggingExample: React.FC<LoggingExampleProps> = ({ caseId, caseContent }) => {
  const { logger, isLoggingInitialized } = useLogging();
  const [message, setMessage] = useState('');
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Example of logging a page visit on component mount
  useEffect(() => {
    if (isLoggingInitialized && logger && caseId) {
      // Set the case ID for all subsequent logs
      logger.setCaseId(caseId);
      
      // Log page visit
      logger.logPageVisit('example_page', 'enter')
        .then(logId => {
          addLogMessage(`Page visit logged with ID: ${logId}`);
        })
        .catch(error => {
          addLogMessage(`Error logging page visit: ${error.message}`);
        });
      
      // Log page exit on unmount
      return () => {
        logger.logPageVisit('example_page', 'exit')
          .catch(error => console.error('Error logging page exit:', error));
      };
    }
  }, [isLoggingInitialized, logger, caseId]);

  const addLogMessage = (msg: string) => {
    setLogMessages(prev => [...prev, msg]);
  };

  // Example of logging a chat message
  const handleSendMessage = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    if (!message.trim()) {
      addLogMessage('Please enter a message');
      return;
    }

    try {
      // Log user message
      const logId = await logger.logChat('user', message, 'example_chat');
      addLogMessage(`Chat message logged with ID: ${logId}`);
      
      // Simulate bot response
      setTimeout(async () => {
        const botMessage = `Response to: ${message}`;
        const botLogId = await logger.logChat('bot', botMessage, 'example_chat');
        addLogMessage(`Bot response logged with ID: ${botLogId}`);
      }, 1000);
      
      setMessage('');
    } catch (error: any) {
      addLogMessage(`Error logging chat: ${error.message}`);
    }
  };

  // Example of logging framework usage
  const handleGenerateIoA = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    try {
      const logId = await logger.logFramework('IoA', 'generate', {
        inputSize: message.length,
        wasEdited: false
      });
      addLogMessage(`IoA generation logged with ID: ${logId}`);
    } catch (error: any) {
      addLogMessage(`Error logging framework usage: ${error.message}`);
    }
  };

  // Example of logging a negotiation party
  const handleAddParty = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    try {
      const logId = await logger.logParty('Example Party', {
        partyRole: 'Client',
        partyType: 'counterpart',
        metadata: { industry: 'Technology' }
      });
      addLogMessage(`Party logged with ID: ${logId}`);
    } catch (error: any) {
      addLogMessage(`Error logging party: ${error.message}`);
    }
  };

  // Example of logging a negotiation issue
  const handleAddIssue = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    try {
      const logId = await logger.logIssue('Pricing Terms', {
        issueDescription: 'Determining the final price for services',
        priorityLevel: 1
      });
      addLogMessage(`Issue logged with ID: ${logId}`);
    } catch (error: any) {
      addLogMessage(`Error logging issue: ${error.message}`);
    }
  };

  // Example of logging a negotiation boundary
  const handleAddBoundary = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    try {
      const logId = await logger.logBoundary(
        'red_line',
        'Minimum acceptable payment terms',
        { value: 'Net 30 days' }
      );
      addLogMessage(`Boundary logged with ID: ${logId}`);
    } catch (error: any) {
      addLogMessage(`Error logging boundary: ${error.message}`);
    }
  };

  // Example of logging a negotiation scenario
  const handleAddScenario = async () => {
    if (!isLoggingInitialized || !logger) {
      addLogMessage('Logging not initialized');
      return;
    }

    try {
      const logId = await logger.logScenario('Best case scenario', {
        scenarioDescription: 'All terms accepted with premium pricing',
        scenarioOutcome: 'Highly favorable'
      });
      addLogMessage(`Scenario logged with ID: ${logId}`);
    } catch (error: any) {
      addLogMessage(`Error logging scenario: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogMessages([]);
  };

  const onClearChat = () => {
    addLogMessage('Chat history cleared from local storage');
  };

  const onClearInterface = () => {
    addLogMessage('Interface state cleared from local storage');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Logging Example</h1>
        <ClearButtons 
          onClearChat={onClearChat} 
          onClearInterface={onClearInterface} 
        />
      </div>

      <div className="mb-6">
        <div className="flex mb-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-r"
          >
            Send
          </button>
        </div>

        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleGenerateIoA}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Generate IoA
          </button>
          <button
            onClick={handleAddParty}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Add Party
          </button>
          <button
            onClick={handleAddIssue}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Add Issue
          </button>
          <button
            onClick={handleAddBoundary}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Add Boundary
          </button>
          <button
            onClick={handleAddScenario}
            className="bg-indigo-500 text-white px-4 py-2 rounded"
          >
            Add Scenario
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-gray-50 h-96 overflow-y-auto">
        <div className="flex justify-between mb-2">
          <h2 className="text-lg font-semibold">Logging Activity</h2>
          <button
            onClick={clearLogs}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear
          </button>
        </div>
        {logMessages.length === 0 ? (
          <p className="text-gray-500">No logs yet. Try the actions above.</p>
        ) : (
          <ul className="space-y-1">
            {logMessages.map((msg, index) => (
              <li key={index} className="text-sm font-mono">
                {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          Status: {isLoggingInitialized ? 'Logging initialized' : 'Logging not initialized'}
        </p>
        {caseId && <p>Current Case ID: {caseId}</p>}
      </div>
    </div>
  );
};

export default LoggingExample; 