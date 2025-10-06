import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage, ChatMessage } from '../services/api/chat';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { addSelectedContext, removeSelectedContext, markContextAutoAdded, resetChatState } from '../store/chatSlice';
import ChecklistIcon from '@mui/icons-material/Checklist';
import type { ContextKey } from '../types/chat';

const HEADER_HEIGHT_DESKTOP = 112;
const HEADER_HEIGHT_MOBILE = 64;

interface ContextOption {
  key: ContextKey;
  label: string;
  description: string;
  content: string | null;
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  width: number;
  onWidthChange?: (width: number) => void;
}

const ChatDrawer = ({ open, onClose, width, onWidthChange }: ChatDrawerProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [drawerWidth, setDrawerWidth] = useState<number>(width);
  const resizingRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const startWidthRef = useRef<number>(width);
  const dispatch = useDispatch<AppDispatch>();
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  const selectedContext = useSelector((state: RootState) => state.chat.selectedContext);

  const contextOptions = useMemo<ContextOption[]>(() => {
    if (!currentCase) {
      return [];
    }

    const options: ContextOption[] = [];

    const party = currentCase.suggestedParties?.[0];
    options.push({
      key: 'party',
      label: 'Party 1',
      description: 'Who you represent',
      content: party
        ? `You are negotiating on behalf of ${party.name}${party.description ? ` (${party.description})` : ''}.`
        : null,
    });

    const analysis = currentCase.analysis;

    options.push({
      key: 'summary',
      label: 'Case Summary',
      description: 'High-level overview',
      content: analysis?.summary?.trim() ? analysis.summary.trim() : null,
    });

    options.push({
      key: 'analysis',
      label: 'Analysis',
      description: 'IoA, Iceberg, Issues',
      content: analysis
        ? `Island of Agreement:\n${analysis.ioa}\n\nIceberg Analysis:\n${analysis.iceberg}\n\nIssues:\n${analysis.components
            .map(component => `- ${component.name}: ${component.description}`)
            .join('\n')}`
        : null,
    });

    options.push({
      key: 'boundaries',
      label: 'Boundaries',
      description: 'Redlines & bottomlines',
      content: analysis?.components?.length
        ? analysis.components
            .map(component => (
              `${component.name}\n  Party 1 Redline: ${component.redlineParty1}\n  Party 1 Bottomline: ${component.bottomlineParty1}\n  Party 2 Redline: ${component.redlineParty2}\n  Party 2 Bottomline: ${component.bottomlineParty2}`
            ))
            .join('\n\n')
        : null,
    });

    options.push({
      key: 'scenarios',
      label: 'Scenarios',
      description: 'Spectrum examples',
      content: currentCase.scenarios?.length
        ? currentCase.scenarios
            .map(scenario => (
              `${scenario.id || scenario.componentId}: [${scenario.type}] ${scenario.description}`
            ))
            .join('\n')
        : null,
    });

    return options;
  }, [currentCase]);

  const canSend = draft.trim().length > 0 && !isSending;

  useEffect(() => {
    if (open) {
      // Reset error when panel opens
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setError(null);
  }, [currentCase?.id]);

  useEffect(() => {
    if (currentCase?.id) {
      dispatch(resetChatState());
    }
  }, [dispatch, currentCase?.id]);

  const clampWidthValue = useCallback((value: number) => {
    const minWidth = 280;
    const dynamicMax = Math.min(600, window.innerWidth - 160);
    return Math.min(Math.max(value, minWidth), dynamicMax);
  }, []);

  useEffect(() => {
    setDrawerWidth(width);
    startWidthRef.current = width;
  }, [width]);

  const stopResizing = useCallback(() => {
    resizingRef.current = false;
    document.body.style.cursor = '';
    startXRef.current = null;
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      event.preventDefault();
      if (startXRef.current === null) return;
      const delta = startXRef.current - event.clientX;
      const newWidth = clampWidthValue(startWidthRef.current + delta);
      setDrawerWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!resizingRef.current || event.touches.length === 0) return;
      if (startXRef.current === null) return;
      const delta = startXRef.current - event.touches[0].clientX;
      const newWidth = clampWidthValue(startWidthRef.current + delta);
      setDrawerWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        stopResizing();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [clampWidthValue, stopResizing, onWidthChange]);

  const beginResize = (event: React.MouseEvent | React.TouchEvent) => {
    if (event.type === 'mousedown') {
      const mouseEvent = event as React.MouseEvent;
      resizingRef.current = true;
      document.body.style.cursor = 'col-resize';
      startXRef.current = mouseEvent.clientX;
      startWidthRef.current = drawerWidth;
      event.preventDefault();
    } else if (event.type === 'touchstart') {
      const touchEvent = event as React.TouchEvent;
      if (touchEvent.touches.length > 0) {
        resizingRef.current = true;
        startXRef.current = touchEvent.touches[0].clientX;
        startWidthRef.current = drawerWidth;
      }
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const available = contextOptions.filter(option => option.content && option.content.trim().length > 0);
    available.forEach(option => {
      dispatch(markContextAutoAdded(option.key));
    });
  }, [contextOptions, dispatch, open]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const streamReply = useCallback(async (text: string, index: number) => {
    if (!text) {
      return;
    }
    const totalLength = text.length;
    const chunkSize = Math.max(1, Math.floor(totalLength / 60));

    for (let i = chunkSize; i <= totalLength; i += chunkSize) {
      const slice = text.slice(0, Math.min(totalLength, i));
      setMessages(prev => {
        if (!prev[index]) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], content: slice };
        return updated;
      });
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    setMessages(prev => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], content: text };
      return updated;
    });
  }, []);

  const handleSend = async () => {
    if (!draft.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: draft.trim()
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft('');
    setIsSending(true);
    setError(null);

    const placeholderIndex = nextMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const contextText = contextOptions
      .filter(option => selectedContext.includes(option.key) && option.content)
      .map(option => `### ${option.label}\n${option.content}`)
      .join('\n\n');

    try {
      const reply = await sendChatMessage(nextMessages, contextText || undefined);
      await streamReply(reply, placeholderIndex);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setMessages(prev => prev.slice(0, placeholderIndex));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        handleSend();
      }
    }
  };

  const placeholder = useMemo(() => (
    'Ask about negotiation components, strategies, or how to interpret the generated analysis.'
  ), []);

  const toggleContext = (key: ContextKey) => {
    if (selectedContext.includes(key)) {
      dispatch(removeSelectedContext(key));
    } else {
      dispatch(addSelectedContext(key));
    }
  };

  if (!open) {
    return null;
  }

  const effectiveWidth = clampWidthValue(drawerWidth);

  return (
    <>
      {open && (
        <Box
          onClick={onClose}
          sx={{
            display: { xs: 'block', sm: 'none' },
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.35)',
            zIndex: (theme) => theme.zIndex.modal - 1,
          }}
        />
      )}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: HEADER_HEIGHT_MOBILE, sm: HEADER_HEIGHT_DESKTOP },
          right: { xs: 8, sm: 24 },
          width: { xs: 'calc(100vw - 16px)', sm: `${effectiveWidth}px` },
          height: {
            xs: `calc(100vh - ${HEADER_HEIGHT_MOBILE}px - 16px)`,
            sm: `calc(100vh - ${HEADER_HEIGHT_DESKTOP}px - 32px)`,
          },
          maxHeight: `calc(100vh - ${HEADER_HEIGHT_DESKTOP}px)`,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          boxShadow: 6,
          bgcolor: 'background.paper',
          zIndex: (theme) => theme.zIndex.modal,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 10,
            cursor: { xs: 'default', sm: 'ew-resize' },
            zIndex: 2,
            display: { xs: 'none', sm: 'block' },
            transition: 'background-color 0.2s ease',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 2,
              height: 28,
              borderRadius: 1,
              background: 'repeating-linear-gradient(180deg, rgba(25,118,210,0.8), rgba(25,118,210,0.8) 6px, rgba(25,118,210,0.2) 6px, rgba(25,118,210,0.2) 12px)'
            }
          }}
          onMouseDown={beginResize}
          onTouchStart={beginResize}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatBubbleOutlineIcon color="primary" />
            <Typography variant="h6" component="div">
              Assistant
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close assistant">
            <CloseIcon />
          </IconButton>
        </Box>

        {contextOptions.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChecklistIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" color="text.secondary">
                Context shared with the assistant
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {contextOptions.map(option => {
                const available = Boolean(option.content && option.content.trim().length > 0);
                const selected = selectedContext.includes(option.key);
                return (
                  <Tooltip key={option.key} title={option.description} placement="top" arrow>
                    <span>
                      <Button
                        size="small"
                        variant={selected ? 'contained' : 'outlined'}
                        color={selected ? 'primary' : 'inherit'}
                        disabled={!available}
                        onClick={() => available && toggleContext(option.key)}
                      >
                        {option.label}
                      </Button>
                    </span>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
          {messages.length === 0 && !isSending ? (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary">
                {placeholder}
              </Typography>
            </Paper>
          ) : (
            messages.map((message, index) => (
              <Box
                key={`${message.role}-${index}`}
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    maxWidth: '85%',
                    bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2
                  }}
                >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <Typography variant="body2" sx={{ mb: 1, '&:last-of-type': { mb: 0 } }}>{children}</Typography>,
                      ul: ({ children }) => <Box component="ul" sx={{ pl: 3, mb: 1, '&:last-of-type': { mb: 0 } }}>{children}</Box>,
                      ol: ({ children }) => <Box component="ol" sx={{ pl: 3, mb: 1, '&:last-of-type': { mb: 0 } }}>{children}</Box>,
                      li: ({ children }) => <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>{children}</Typography>,
                      strong: ({ children }) => <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>{children}</Typography>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                )}
              </Paper>
            </Box>
          ))
          )}
          {isSending && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={18} thickness={5} />
              <Typography variant="caption">Thinking...</Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {error && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <ErrorOutlineIcon fontSize="small" />
              <Typography variant="body2">{error}</Typography>
            </Paper>
          </Box>
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
          <TextField
            label="Ask the assistant"
            placeholder="Type your message..."
            multiline
            minRows={2}
            maxRows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            disabled={isSending}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Press Enter to send, Shift+Enter for a new line
            </Typography>
            <Tooltip title={canSend ? 'Send message' : 'Type a message to send'}>
              <span>
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={!canSend}
                  onClick={handleSend}
                >
                  Send
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default ChatDrawer;
