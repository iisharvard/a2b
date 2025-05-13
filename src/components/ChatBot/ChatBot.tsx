import React, { useEffect, useRef } from 'react';
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
  Chip,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { ChatBotProps } from './types';
import { useChatState } from './useChatState';
import { useLogging } from '../../contexts/LoggingContext';
// import { useDebugState } from './useDebugState';
// import { DebugWindow } from './DebugWindow';

// The original indicator data, now used for context list
const CONTEXT_ITEMS = [
  { key: 'ioa', label: 'Islands of Agreement' },
  { key: 'iceberg', label: 'Iceberg Analysis' },
  { key: 'issues', label: 'Issues' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'rlbl', label: 'RL/BL' },
];

const ChatBot: React.FC<ChatBotProps & {
  ioaAccess?: boolean;
  icebergAccess?: boolean;
  issuesAccess?: boolean;
  redlinesAccess?: boolean;
  scenariosAccess?: boolean;
  contextItems?: Array<{key: string, label: string, active: boolean}>;
}> = (props) => {
  const {
    primaryColor = '#2196f3',
    botAvatar,
    userAvatar,
    title = 'Assistant',
    subtitle = 'How can I help you today?',
    splitScreenMode = false,
    disableDebug = false,
    ioaAccess = false,
    icebergAccess = false,
    issuesAccess = false,
    redlinesAccess = false,
    scenariosAccess = false,
    contextItems = CONTEXT_ITEMS.map(item => ({...item, active: false})),
  } = props;

  // Get logging context
  const { logger, isLoggingInitialized } = useLogging();

  const {
    state: chatState,
    refs,
    handlers: originalHandlers,
  } = useChatState(props);

  // Wrap handlers to include logging
  const handlers = {
    ...originalHandlers,
    // Override handleSubmit to include logging
    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      
      // If no input, return early
      if (!chatState.inputValue.trim()) return;
      
      // Log the user's message before sending
      if (isLoggingInitialized && logger) {
        try {
          // Log user message (caseId will be handled by LoggingHelper)
          await logger.logChat('user', chatState.inputValue, 'chat_bot');
        } catch (err) {
          console.error('Error logging chat message:', err);
        }
      }
      
      // Call the original handler
      const result = await originalHandlers.handleSubmit(e);
      
      // The bot's response will be handled separately by the useEffect below
      return result;
    }
  };

  // Debug state is commented out
  /*
  const {
    isDebugWindowOpen,
    changeHistory,
    showFullState,
    lastDiffResult,
    toggleDebugWindow,
    toggleFullState,
    clearHistory,
    createSnapshot
  } = useDebugState();
  */

  const { isOpen, messages, inputValue, isTyping, currentStreamedMessage } = chatState;
  const { messagesEndRef, inputRef } = refs;
  const { handleInputChange, handleKeyPress, toggleChat } = handlers;

  // Debug mode keyboard shortcut is commented out
  /*
  useEffect(() => {
    if (!disableDebug) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
          e.preventDefault();
          toggleDebugWindow();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [toggleDebugWindow, disableDebug]);
  */

  // Log bot responses
  useEffect(() => {
    // Check for new bot messages to log
    if (isLoggingInitialized && logger && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only log bot messages (not user messages, as those are logged in handleSubmit)
      if (
        // First try the 'role' property
        (lastMessage.role === 'assistant' || 
        // Fall back to 'sender' property if role is not available
        (lastMessage.role === undefined && lastMessage.sender === 'bot')) && 
        // Check if not already logged
        lastMessage.logged !== true
      ) {
        // Mark as logged to prevent re-logging
        lastMessage.logged = true;
        
        // Get the message content, favoring 'content' with fallback to 'text'
        const messageContent = lastMessage.content || lastMessage.text;
        
        // Log the bot's message (caseId will be handled by LoggingHelper)
        logger.logChat('bot', messageContent, 'chat_bot')
          .catch(err => console.error('Error logging bot message:', err));
      }
    }
  }, [isLoggingInitialized, logger, messages]);

  // In split-screen mode, we're always visible
  const shouldRenderChat = splitScreenMode || isOpen;
  
  // For split-screen mode, force isOpen to be true
  useEffect(() => {
    if (splitScreenMode && !isOpen) {
      toggleChat();
    }
  }, [splitScreenMode, isOpen, toggleChat]);

  // Indicator access map
  const indicatorAccess = {
    ioa: ioaAccess,
    iceberg: icebergAccess,
    issues: issuesAccess,
    redlines: redlinesAccess,
    scenarios: scenariosAccess,
  };

  // Ref for horizontal scrolling container
  const contextScrollRef = useRef<HTMLDivElement>(null);

  // Find active context items
  const activeContextItems = contextItems.filter(item => item.active);

  return (
    <>
      {/* Only show chat button in popup mode */}
      {!splitScreenMode && (
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
      )}

      {/* Chat window */}
      {shouldRenderChat && (
        <Paper
          elevation={splitScreenMode ? 0 : 3}
          style={{
            position: splitScreenMode ? 'relative' : 'fixed',
            bottom: splitScreenMode ? 'auto' : '80px',
            right: splitScreenMode ? 'auto' : '20px',
            width: splitScreenMode ? '100%' : '350px',
            height: splitScreenMode ? '100%' : '500px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: splitScreenMode ? 'auto' : 1000,
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
            {/* Only show close button in popup mode */}
            {!splitScreenMode && (
              <IconButton color="inherit" onClick={toggleChat} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>

          {/* Context List - replaced indicator lights */}
          <Box 
            ref={contextScrollRef}
            sx={{ 
              borderBottom: '1px solid #e0e0e0', 
              padding: '16px 12px', // Explicit large padding
              bgcolor: '#f5f5f5', 
              overflowX: 'auto',
              overflowY: 'hidden',
              minHeight: '60px', // Explicit minimum height
              display: 'flex',
              alignItems: 'center',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': {
                height: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '10px',
              }
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                color: 'text.secondary', 
                flexShrink: 0,
                mr: 2, // More spacing after the text
                lineHeight: 1.5 // Prevent clipping
              }}
            >
              Context considering:
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              whiteSpace: 'nowrap',
              minWidth: 'max-content',
            }}>
              {activeContextItems.length > 0 ? (
                activeContextItems.map((item, index) => (
                  <Chip 
                    key={item.key}
                    label={item.label}
                    size="small"
                    sx={{ 
                      bgcolor: primaryColor,
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      height: 'auto',
                      py: 1, // Increased vertical padding
                      px: 1, // Added horizontal padding
                      '& .MuiChip-label': {
                        padding: '2px 4px', // Extra padding for the label
                      }
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                  No active context
                </Typography>
              )}
            </Box>
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

              {/* This is an invisible element to scroll to bottom */}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Chat input */}
          <Box
            component="form"
            onSubmit={handlers.handleSubmit}
            sx={{
              p: 2,
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
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
              sx={{ mr: 1 }}
              InputProps={{
                sx: {
                  borderRadius: 2.5,
                }
              }}
            />
            <IconButton
              color="primary"
              aria-label="send"
              type="submit"
              disabled={!inputValue.trim()}
              sx={{
                bgcolor: primaryColor,
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                }
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Debug window is disabled
      {!disableDebug && (
        <DebugWindow
          isOpen={isDebugWindowOpen}
          onClose={toggleDebugWindow}
          changeHistory={changeHistory}
          showFullState={showFullState}
          toggleFullState={toggleFullState}
          lastDiffResult={lastDiffResult}
          clearHistory={clearHistory}
          createSnapshot={createSnapshot}
        />
      )}
      */}
    </>
  );
};

export { ChatBot }; 