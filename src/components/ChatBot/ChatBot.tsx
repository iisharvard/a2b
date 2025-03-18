import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  Fab,
  CircularProgress,
  Fade,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { streamChatCompletion, ChatMessage } from '../../services/chatService';
import { useChatContext } from './ChatContextProvider';

// Define message types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  apiKey?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  botAvatar?: string;
  userAvatar?: string;
  initialMessage?: string;
  systemMessage?: string;
}

// Helper function to extract content from an object with unknown structure
const extractContent = (obj: any): string => {
  if (!obj) return '';
  
  // If it's a string, return it directly
  if (typeof obj === 'string') return obj;
  
  // For objects with multiple possible content fields
  // First check the most likely fields to contain content
  const contentFields = ['content', 'text', 'caseContent', 'caseText', 'description', 'body', 'data'];
  for (const field of contentFields) {
    if (obj[field] && typeof obj[field] === 'string' && obj[field].trim().length > 10) {
      console.log(`Found content in field "${field}":`, obj[field].substring(0, 30) + '...');
      return obj[field];
    }
  }
  
  // Try checking all properties on the object to find anything that looks like content
  for (const key in obj) {
    if (typeof obj[key] === 'string' && obj[key].trim().length > 20) {
      console.log(`Found string content in field "${key}":`, obj[key].substring(0, 30) + '...');
      return obj[key];
    }
  }
  
  // For array of objects with name/description structure (like parties)
  if (Array.isArray(obj)) {
    return obj
      .map(item => {
        if (item && typeof item === 'object') {
          // Check for common field pairs
          if (item.name && item.description) {
            return `${item.name}: ${item.description}`;
          }
          if (item.title && item.content) {
            return `${item.title}: ${item.content}`;
          }
          if (item.title && item.description) {
            return `${item.title}: ${item.description}`;
          }
          
          // Otherwise, concatenate all string fields that aren't empty
          const fields: string[] = [];
          for (const field in item) {
            if (typeof item[field] === 'string' && item[field].trim()) {
              fields.push(item[field]);
            }
          }
          if (fields.length > 0) {
            return fields.join(': ');
          }
        }
        return '';
      })
      .filter(text => text.trim().length > 0)
      .join('\n\n');
  }
  
  // Last resort: stringify the object to see its structure
  console.log('Unable to extract content directly, object structure:', JSON.stringify(obj, null, 2).substring(0, 200) + '...');
  return '';
};

const ChatBot: React.FC<ChatBotProps> = ({
  apiKey = import.meta.env.VITE_OPENAI_API_KEY || '',
  title = 'Assistant',
  subtitle = 'How can I help you today?',
  primaryColor = '#2196f3',
  botAvatar,
  userAvatar,
  initialMessage = "Hi there! I'm your AI assistant. Feel free to ask me anything about the case setup or file uploads.",
  systemMessage = "You are a helpful assistant for a case setup application that helps with file uploads and case management. Be concise and direct in your responses.",
}) => {
  // Only select the currentCase from state to avoid unnecessary rerenders
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  
  // Access the context
  const { interfaceContent, addInterfaceContent } = useChatContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([
    { role: 'system', content: systemMessage },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  // Stream state for storing the in-progress streamed response
  const [currentStreamedMessage, setCurrentStreamedMessage] = useState<Message | null>(null);

  // Function to manually gather all relevant context from the currentCase
  const gatherContext = () => {
    console.log("Manually gathering context from currentCase");
    
    if (!currentCase) {
      console.log("No current case found");
      addInterfaceContent('System', 'No case data is available.');
      return;
    }
    
    console.log("Current case:", currentCase);
    console.log("Current case keys:", Object.keys(currentCase));
    
    // Debug: Inspect each property of currentCase to find content
    Object.keys(currentCase).forEach(key => {
      const value = (currentCase as any)[key];
      console.log(`Inspecting currentCase.${key}:`, typeof value);
      
      if (typeof value === 'string' && value.length > 10) {
        console.log(`- Found string in currentCase.${key}:`, value.substring(0, 30) + '...');
      } else if (value && typeof value === 'object') {
        console.log(`- Object in currentCase.${key} with keys:`, Object.keys(value));
      }
    });
    
    // Extract case content
    const caseContent = extractContent(currentCase);
    if (caseContent) {
      console.log("Found case content:", caseContent.substring(0, 100) + '...');
      addInterfaceContent('Case Content', caseContent);
    } else {
      console.log("No content extracted from case object");
      
      // Try alternative methods to extract content
      // 1. Check if it's directly in the currentCase
      if (currentCase.content && typeof currentCase.content === 'string' && currentCase.content.trim().length > 0) {
        console.log("Found content directly in currentCase.content");
        addInterfaceContent('Case Content', currentCase.content);
      } 
      // 2. Try other known properties based on debugging
      else if ((currentCase as any).id && (currentCase as any).content) {
        console.log("Found content in id/content structure");
        addInterfaceContent('Case Content', (currentCase as any).content);
      }
      // 3. Last resort - use JSON stringify to at least get some representation
      else {
        console.log("Using stringified case as last resort");
        const stringContent = JSON.stringify(currentCase, null, 2);
        if (stringContent.length > 50) {
          addInterfaceContent('Case Data (JSON)', stringContent);
        }
      }
    }
    
    // Extract parties information
    if (currentCase.suggestedParties && currentCase.suggestedParties.length > 0) {
      const partiesContent = extractContent(currentCase.suggestedParties);
      if (partiesContent) {
        console.log("Found parties information");
        addInterfaceContent('Parties Information', partiesContent);
      }
    }
    
    // Extract analysis information
    const analysis = (currentCase as any).analysis;
    if (analysis) {
      let analysisContent = 'Analysis Summary:\n';
      
      if (analysis.summary) {
        analysisContent += analysis.summary + '\n\n';
      }
      
      if (analysis.components && analysis.components.length > 0) {
        analysisContent += 'Key Components:\n';
        analysis.components.forEach((component: any, index: number) => {
          analysisContent += `${index + 1}. ${component.title}: ${component.description}\n`;
        });
      }
      
      console.log("Found analysis information");
      addInterfaceContent('Analysis', analysisContent);
    }
    
    // Extract boundaries information
    const boundaries = (currentCase as any).boundaries;
    if (boundaries) {
      let boundariesContent = 'Negotiation Boundaries:\n';
      
      if (boundaries.redlines && boundaries.redlines.length > 0) {
        boundariesContent += 'Redlines (Must Have):\n';
        boundaries.redlines.forEach((item: any, index: number) => {
          boundariesContent += `${index + 1}. ${item.description}\n`;
        });
        boundariesContent += '\n';
      }
      
      if (boundaries.bottomlines && boundaries.bottomlines.length > 0) {
        boundariesContent += 'Bottomlines (Minimum Acceptable):\n';
        boundaries.bottomlines.forEach((item: any, index: number) => {
          boundariesContent += `${index + 1}. ${item.description}\n`;
        });
      }
      
      console.log("Found boundaries information");
      addInterfaceContent('Boundaries', boundariesContent);
    }
    
    // Extract scenarios information
    const scenarios = (currentCase as any).scenarios;
    if (scenarios && Array.isArray(scenarios) && scenarios.length > 0) {
      let scenariosContent = 'Negotiation Scenarios:\n';
      
      scenarios.forEach((scenario: any, index: number) => {
        scenariosContent += `Scenario ${index + 1}: ${scenario.title}\n`;
        scenariosContent += `Description: ${scenario.description}\n`;
        scenariosContent += `Outcome: ${scenario.outcome}\n\n`;
      });
      
      console.log("Found scenarios information");
      addInterfaceContent('Scenarios', scenariosContent);
    }
    
    // Create availability summary
    createAvailabilitySummary();
  };
  
  // Create a summary of available data
  const createAvailabilitySummary = () => {
    // Check what information is available
    const hasCase = !!extractContent(currentCase);
    const hasParties = !!(currentCase?.suggestedParties && currentCase.suggestedParties.length > 0);
    const hasAnalysis = !!(currentCase && (currentCase as any).analysis);
    const hasBoundaries = !!(currentCase && (currentCase as any).boundaries);
    const hasScenarios = !!(currentCase && (currentCase as any).scenarios && 
                           Array.isArray((currentCase as any).scenarios) && 
                           (currentCase as any).scenarios.length > 0);
    
    // Generate availability message
    let availabilityMessage = 'Current available context:\n';
    availabilityMessage += `- Case content: ${hasCase ? 'Available' : 'Not available'}\n`;
    availabilityMessage += `- Parties information: ${hasParties ? 'Available' : 'Not available'}\n`;
    availabilityMessage += `- Analysis: ${hasAnalysis ? 'Available' : 'Not available'}\n`;
    availabilityMessage += `- Negotiation boundaries: ${hasBoundaries ? 'Available' : 'Not available'}\n`;
    availabilityMessage += `- Negotiation scenarios: ${hasScenarios ? 'Available' : 'Not available'}\n\n`;
    
    if (!hasCase && !hasParties && !hasAnalysis && !hasBoundaries && !hasScenarios) {
      availabilityMessage += 'No case data is available yet. Please use the application to create case content, analyze it, and develop negotiation strategies.';
    } else {
      availabilityMessage += 'You can ask questions about the available data. For missing data, please navigate to the appropriate tab in the application to create it.';
    }
    
    console.log("Creating availability summary");
    addInterfaceContent('Data Availability', availabilityMessage);
  };

  // Function to generate context from interfaceContent
  const generateContextString = () => {
    console.log("Interface content in ChatBot:", interfaceContent);
    
    if (!interfaceContent || interfaceContent.length === 0) {
      console.log("No interface content available");
      return '';
    }
    
    // Format the last 8 items from interface content
    const recentContent = interfaceContent
      .slice(-8)
      .map(item => {
        const timeFormatted = item.timestamp.toLocaleTimeString();
        return `[${timeFormatted} - ${item.type}]: ${item.content}`;
      })
      .join('\n\n');
    
    return `\n\nRecent content from the user's interface:\n${recentContent}\n\nUse this context to provide more relevant responses when appropriate.`;
  };

  // Add initial message when component mounts
  useEffect(() => {
    if (initialMessage && isFirstOpen && isOpen) {
      // Create initial welcome message
      const initialBotMessage: Message = {
        id: 'initial',
        text: initialMessage,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      // Create context availability message
      const availabilityMessage: Message = {
        id: 'context-info',
        text: "I have access to your case data and can help answer questions about it. If you'd like to know what information is available, just ask me 'What context do you have?' or 'What data can you see?'",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      // Add both messages
      setMessages([initialBotMessage, availabilityMessage]);
      
      // Update conversation with both messages
      setConversation([
        { role: 'system', content: systemMessage },
        { role: 'assistant', content: initialMessage },
        { role: 'assistant', content: availabilityMessage.text },
      ] as ChatMessage[]);
      
      setIsFirstOpen(false);
      
      // Gather context when chat is first opened
      gatherContext();
    }
  }, [initialMessage, isFirstOpen, isOpen, systemMessage]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamedMessage]);

  // Focus on input when chat is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!inputValue.trim() || isTyping) return;

    // Gather fresh context from Redux before processing the message
    gatherContext();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message to messages
    setMessages((prev) => [...prev, userMessage]);
    
    // Enhance system message with context from the interface
    const contextString = generateContextString();
    const enhancedSystemMessage = systemMessage + contextString;
    
    // Add user message to conversation
    const updatedConversation: ChatMessage[] = [
      // Replace the system message with enhanced one
      { role: 'system', content: enhancedSystemMessage } as ChatMessage,
      // Include all non-system messages from the existing conversation
      ...conversation.filter(msg => msg.role !== 'system'),
      // Add the new user message
      { role: 'user', content: inputValue } as ChatMessage,
    ];
    
    // Log what's being sent to the API
    console.log('Sending to OpenAI API:', JSON.stringify(updatedConversation, null, 2));
    
    setConversation(updatedConversation);
    setInputValue('');
    setIsTyping(true);

    // Create empty streamed message
    const streamedMessageId = (Date.now() + 1).toString();
    const initialStreamedMessage: Message = {
      id: streamedMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };
    setCurrentStreamedMessage(initialStreamedMessage);

    try {
      // Use streaming API
      await streamChatCompletion(
        updatedConversation,
        apiKey,
        {
          onStart: () => {
            // Already handled by setting isTyping and initialStreamedMessage
            console.log('Stream started');
          },
          onToken: (token: string) => {
            // Update the currently streaming message with new token
            setCurrentStreamedMessage((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                text: prev.text + token,
              };
            });
          },
          onComplete: (fullResponse: string) => {
            console.log('Stream completed:', fullResponse);
            
            // Add completed message to messages
            const completedMessage: Message = {
              id: streamedMessageId,
              text: fullResponse,
              sender: 'bot',
              timestamp: new Date(),
            };
            
            setMessages((prev) => [...prev, completedMessage]);
            setCurrentStreamedMessage(null);
            
            // Update conversation with assistant response
            setConversation((prev) => [
              ...prev.filter(msg => msg.role !== 'system'),
              { role: 'system', content: systemMessage },
              { role: 'assistant', content: fullResponse } as ChatMessage,
            ]);
          },
          onError: (error: Error) => {
            console.error('Error in chat streaming:', error);
            
            // Add error message
            const errorMessage: Message = {
              id: Date.now().toString(),
              text: 'Sorry, I encountered an error. Please try again later.',
              sender: 'bot',
              timestamp: new Date(),
            };
            
            setMessages((prev) => [...prev, errorMessage]);
            setCurrentStreamedMessage(null);
          },
        }
      );
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentStreamedMessage(null);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // All messages including streamed message
  const allMessages = currentStreamedMessage
    ? [...messages, currentStreamedMessage]
    : messages;

  return (
    <>
      {/* Chat button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: 24,
            bgcolor: isOpen ? '#f5f5f5' : primaryColor,
            color: isOpen ? 'text.primary' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              filter: 'brightness(0.95)',
            },
          }}
          onClick={toggleChat}
        >
          {isOpen ? (
            <>
              <CloseIcon sx={{ mr: 1 }} />
              <Typography variant="button">Close</Typography>
            </>
          ) : (
            <>
              <ChatIcon sx={{ mr: 1 }} />
              <Typography variant="button">Ask assistant</Typography>
            </>
          )}
        </Paper>
      </Box>

      {/* Chat window */}
      <Fade in={isOpen}>
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 350,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            border: `1px solid ${primaryColor}`,
            borderRadius: 2,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: primaryColor,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="caption">{subtitle}</Typography>
            </Box>
            <IconButton color="inherit" onClick={toggleChat} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: '#f5f5f5',
            }}
          >
            <List sx={{ width: '100%', padding: 0 }}>
              {allMessages.map((message) => (
                <ListItem
                  key={message.id}
                  alignItems="flex-start"
                  sx={{
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    mb: 1,
                    padding: 0,
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                      src={message.sender === 'bot' ? botAvatar : userAvatar}
                      sx={{
                        bgcolor: message.sender === 'bot' ? primaryColor : '#e0e0e0',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {message.sender === 'bot' ? <SmartToyIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    sx={{
                      p: 1.5,
                      ml: message.sender === 'user' ? 1 : 0,
                      mr: message.sender === 'bot' ? 1 : 0,
                      bgcolor: message.sender === 'bot' ? '#ffffff' : primaryColor,
                      color: message.sender === 'bot' ? 'text.primary' : '#fff',
                      borderRadius: 2,
                      display: 'inline-block',
                      maxWidth: '75%',
                    }}
                  >
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                      {message.text}
                      {message.id === currentStreamedMessage?.id && (
                        <span className="cursor-blink">|</span>
                      )}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  variant="outlined"
                  size="small"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  disabled={isTyping}
                  inputRef={inputRef}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    },
                  }}
                />
                <IconButton 
                  color="primary" 
                  sx={{ ml: 1, bgcolor: primaryColor, color: 'white', '&:hover': { bgcolor: primaryColor, filter: 'brightness(0.9)' } }} 
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                >
                  {isTyping ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                </IconButton>
              </Box>
            </form>
          </Box>
        </Paper>
      </Fade>

      {/* CSS for cursor blink effect */}
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        .cursor-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </>
  );
};

export default ChatBot; 