import React, { useEffect } from 'react';
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
import { ChatBotProps } from './types';
import { useChatState } from './useChatState';
import { useDebugState } from './useDebugState';
import { DebugWindow } from './DebugWindow';

const ChatBot: React.FC<ChatBotProps> = (props) => {
  const {
    primaryColor = '#2196f3',
    botAvatar,
    userAvatar,
    title = 'Assistant',
    subtitle = 'How can I help you today?',
    splitScreenMode = false,
  } = props;

  const {
    state: chatState,
    refs,
    handlers,
  } = useChatState(props);

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

  const { isOpen, messages, inputValue, isTyping, currentStreamedMessage } = chatState;
  const { messagesEndRef, inputRef } = refs;
  const { handleInputChange, handleSubmit, handleKeyPress, toggleChat } = handlers;

  // Debug mode keyboard shortcut (Cmd+I or Ctrl+I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        toggleDebugWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugWindow]);

  // In split-screen mode, we're always visible
  const shouldRenderChat = splitScreenMode || isOpen;
  
  // For split-screen mode, force isOpen to be true
  useEffect(() => {
    if (splitScreenMode && !isOpen) {
      toggleChat();
    }
  }, [splitScreenMode, isOpen, toggleChat]);

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
            onSubmit={handleSubmit}
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
              onClick={handleSubmit}
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

      {/* Debug window */}
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
    </>
  );
};

export { ChatBot }; 