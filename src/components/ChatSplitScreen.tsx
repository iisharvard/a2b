import React, { useState, ReactNode } from 'react';
import SplitPane, { Pane } from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ChatBot } from './ChatBot';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';

// Custom CSS for better resizer appearance
import './ChatSplitScreen.css';

interface ChatSplitScreenProps {
  children: ReactNode;
  chatBotProps: any; // Pass through the ChatBot props
}

const ChatSplitScreen: React.FC<ChatSplitScreenProps> = ({ children, chatBotProps }) => {
  // Initial size - main content takes 70%, chat takes 30%
  const [sizes, setSizes] = useState<(string | number)[]>(['70%', '30%']);
  // Track if chat is open or closed
  const [isChatOpen, setIsChatOpen] = useState(true);
  // Store previous size when closing
  const [prevChatSize, setPrevChatSize] = useState<string | number>('30%');

  // Close chat panel
  const handleCloseChat = () => {
    setPrevChatSize(sizes[1]);
    setSizes(['100%', 0]);
    setIsChatOpen(false);
  };

  // Reopen chat panel
  const handleOpenChat = () => {
    setSizes(['70%', prevChatSize]);
    setIsChatOpen(true);
  };

  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative' }}>
      <SplitPane
        split="vertical"
        sizes={sizes}
        onChange={(newSizes) => {
          // Only update sizes if chat is open
          if (isChatOpen) {
            setSizes(newSizes);
          }
        }}
        resizerSize={8} // Increase resizer size for better usability
        sashRender={(index, active) => (
          <Box 
            className={`custom-sash ${active ? 'active' : ''}`}
            sx={{
              width: '8px',
              backgroundColor: 'transparent', // Make background transparent to use the CSS styles
              cursor: 'col-resize',
              transition: 'background-color 0.2s ease',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Hide the resizer when chat is closed
              opacity: isChatOpen ? 1 : 0,
              pointerEvents: isChatOpen ? 'auto' : 'none',
            }}
          />
        )}
      >
        <Pane minSize="50%" maxSize={isChatOpen ? "85%" : "100%"}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {children}
          </Box>
        </Pane>
        <Pane minSize={isChatOpen ? "250px" : "0"} maxSize="50%">
          <Box 
            sx={{ 
              height: '100%', 
              overflow: 'auto', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {isChatOpen && (
              <>
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    zIndex: 1050,
                  }}
                >
                  <Tooltip title="Close chat">
                    <IconButton 
                      onClick={handleCloseChat}
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <ChatBot 
                  {...chatBotProps}
                  splitScreenMode={true} 
                />
              </>
            )}
          </Box>
        </Pane>
      </SplitPane>

      {/* Button to reopen chat when closed */}
      {!isChatOpen && (
        <Tooltip title="Open chat">
          <IconButton
            onClick={handleOpenChat}
            sx={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: chatBotProps.primaryColor || '#1976d2',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              zIndex: 1000,
            }}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ChatSplitScreen; 