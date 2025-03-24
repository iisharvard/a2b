import React, { useState, useRef, useEffect } from 'react';
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

const ChatBot: React.FC<ChatBotProps> = ({
  apiKey = import.meta.env.VITE_OPENAI_API_KEY || '',
  title = 'Assistant',
  subtitle = 'How can I help you today?',
  primaryColor = '#2196f3',
  botAvatar,
  userAvatar,
  initialMessage = "Hi there! I'm your AI assistant. Feel free to ask me anything.",
  systemMessage = "You are a helpful assistant. Be concise and direct in your responses.",
}) => {
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

    if (!inputValue.trim()) return;

    // Generate a unique ID for the user message
    const userMessageId = `user-${Date.now()}`;
    
    // Create the user message
    const userMessage: Message = {
      id: userMessageId,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message to the UI
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Add user message to the conversation history for API
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
    };
    
    // Create a new conversation array with the user's message
    const newConversation = [...conversation, userChatMessage];
    setConversation(newConversation);
    
    // Clear input field
    setInputValue('');
    
    // Show typing indicator
    setIsTyping(true);
    
    // Generate a unique ID for the bot message
    const botMessageId = `bot-${Date.now()}`;
    
    // Create an initial empty bot message for streaming
    const initialBotMessage: Message = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };
    
    // Set the current streamed message to empty initially
    setCurrentStreamedMessage(initialBotMessage);
    
    try {
      let fullResponse = '';
      
      // Start streaming the response
      await streamChatCompletion(
        newConversation,
        apiKey,
        {
          onStart: () => {
            // Already handled by setting isTyping
          },
          onToken: (token) => {
            // Append the chunk to the full response
            fullResponse += token;
            
            // Update the currently streaming message
            setCurrentStreamedMessage(prev => {
              if (prev) {
                return { ...prev, text: fullResponse };
              }
              return null;
            });
          },
          onComplete: (response) => {
            // Final response is already in fullResponse
          },
          onError: (error) => {
            throw error; // Will be caught by the catch block
          }
        }
      );
      
      // Create the final bot message with the complete response
      const botMessage: Message = {
        id: botMessageId,
        text: fullResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      // Add the bot's response to conversation history for API
      const botChatMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
      };
      
      // Add the bot message to the UI
      setMessages(prevMessages => [
        ...prevMessages.filter(m => m.id !== botMessageId), // Remove streaming message
        botMessage // Add the final message
      ]);
      
      // Add the bot message to conversation history
      setConversation(prev => [...prev, botChatMessage]);
      
      // Reset streaming state
      setCurrentStreamedMessage(null);
    } catch (error) {
      // If there's an error, add an error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [
        ...prevMessages.filter(m => m.id !== botMessageId), // Remove streaming message if any
        errorMessage
      ]);
      
      // Reset streaming state
      setCurrentStreamedMessage(null);
    } finally {
      // Hide typing indicator
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Scroll to the bottom of the messages when a new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamedMessage]);

  // Focus the input field when the chat is opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      
      // If this is the first time opening the chat, add the initial bot message
      if (isFirstOpen && initialMessage) {
        setMessages([
          {
            id: `bot-initial`,
            text: initialMessage,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
        setIsFirstOpen(false);
      }
    }
  }, [isOpen, isFirstOpen, initialMessage]);

  return (
    <>
      {/* Chat button */}
      <Fab
        color="primary"
        aria-label="chat"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: primaryColor,
          zIndex: 1000,
        }}
        onClick={toggleChat}
      >
        <ChatIcon />
      </Fab>

      {/* Chat window */}
      <Fade in={isOpen}>
        <Paper
          elevation={3}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '350px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Chat header */}
          <Box
            sx={{
              backgroundColor: primaryColor,
              color: 'white',
              p: 2,
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

          {/* Chat messages */}
          <Box
            sx={{
              p: 2,
              flexGrow: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <List sx={{ width: '100%', p: 0 }}>
              {messages.map((message) => (
                <ListItem
                  key={message.id}
                  alignItems="flex-start"
                  sx={{
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    px: 0,
                  }}
                >
                  <ListItemAvatar
                    sx={{
                      minWidth: 40,
                      mt: 0,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: message.sender === 'user' ? 'secondary.main' : primaryColor,
                      }}
                      src={message.sender === 'user' ? userAvatar : botAvatar}
                    >
                      {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <Box
                    sx={{
                      backgroundColor: message.sender === 'user' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(33, 150, 243, 0.08)',
                      borderRadius: 1.5,
                      p: 1,
                      maxWidth: '70%',
                      marginLeft: message.sender === 'user' ? 'auto' : 0,
                      marginRight: message.sender === 'user' ? 0 : 'auto',
                    }}
                  >
                    <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
              
              {/* Show the currently streaming message */}
              {currentStreamedMessage && (
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    px: 0,
                  }}
                >
                  <ListItemAvatar
                    sx={{
                      minWidth: 40,
                      mt: 0,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: primaryColor,
                      }}
                      src={botAvatar}
                    >
                      <SmartToyIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(33, 150, 243, 0.08)',
                      borderRadius: 1.5,
                      p: 1,
                      maxWidth: '70%',
                    }}
                  >
                    <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                      {currentStreamedMessage.text}
                      <span className="blinking-cursor">|</span>
                    </Typography>
                  </Box>
                </ListItem>
              )}
              
              {/* Typing indicator */}
              {isTyping && !currentStreamedMessage && (
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    px: 0,
                  }}
                >
                  <ListItemAvatar
                    sx={{
                      minWidth: 40,
                      mt: 0,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: primaryColor,
                      }}
                      src={botAvatar}
                    >
                      <SmartToyIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                    }}
                  >
                    <CircularProgress size={16} thickness={4} />
                  </Box>
                </ListItem>
              )}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Chat input */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 2,
              borderTop: '1px solid rgba(0, 0, 0, 0.12)',
              display: 'flex',
            }}
          >
            <TextField
              fullWidth
              placeholder="Type a message..."
              variant="outlined"
              size="small"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              inputRef={inputRef}
              InputProps={{
                endAdornment: (
                  <IconButton
                    color="primary"
                    onClick={() => handleSubmit()}
                    disabled={!inputValue.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Paper>
      </Fade>
    </>
  );
};

export default ChatBot; 