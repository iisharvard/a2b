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
  } = props;

  const {
    state: chatState,
    refs,
    handlers,
  } = useChatState(props);

  const {
    state: debugState,
    refreshState,
    clearHistory,
    toggleDebugWindow,
    toggleFullState,
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
                  <IconButton color="primary" onClick={() => handleSubmit()} disabled={!inputValue.trim()}>
                    <SendIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Paper>
      </Fade>

      {/* Debug Window */}
      {debugState.isDebugWindowOpen && (
        <DebugWindow
          state={debugState}
          onClose={toggleDebugWindow}
          onRefresh={refreshState}
          onClearHistory={clearHistory}
          onToggleFullState={toggleFullState}
        />
      )}
    </>
  );
};

export default ChatBot; 