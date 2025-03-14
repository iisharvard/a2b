import { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Divider } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  height?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MarkdownEditor = ({ value, onChange, label, placeholder, height = '400px', disabled = false }: MarkdownEditorProps) => {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 1.5, 
            fontWeight: 'medium',
            color: 'text.primary'
          }}
        >
          {label}
        </Typography>
      )}
      <Paper 
        variant="outlined" 
        sx={{ 
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 1,
          opacity: disabled ? 0.7 : 1,
          position: 'relative'
        }}
      >
        <Tabs 
          value={tab} 
          onChange={handleTabChange} 
          aria-label="markdown editor tabs"
          sx={{
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 'medium',
              fontSize: '0.9rem',
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: 'primary.main',
              fontWeight: 'bold',
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            pointerEvents: disabled ? 'none' : 'auto'
          }}
        >
          <Tab 
            icon={<EditIcon fontSize="small" />} 
            iconPosition="start" 
            label="Edit" 
            disabled={disabled}
          />
          <Tab 
            icon={<VisibilityIcon fontSize="small" />} 
            iconPosition="start" 
            label="Preview" 
            disabled={disabled}
          />
        </Tabs>
        
        <Box sx={{ height, overflow: 'auto' }}>
          {tab === 0 ? (
            <Box sx={{ height: '100%' }}>
              <CodeMirror
                value={value}
                height={height}
                onChange={(value) => onChange(value)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  bracketMatching: true,
                }}
                placeholder={placeholder}
                editable={!disabled}
                style={{
                  fontSize: '0.95rem',
                  fontFamily: '"Roboto Mono", monospace',
                }}
              />
            </Box>
          ) : (
            <Box 
              sx={{ 
                p: 3,
                height: '100%',
                overflow: 'auto',
                bgcolor: '#fcfcfc',
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  color: 'text.primary',
                  fontWeight: 'medium',
                  mb: 2,
                  mt: 3,
                  '&:first-of-type': {
                    mt: 0,
                  }
                },
                '& p': {
                  mb: 2,
                  lineHeight: 1.7,
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 2,
                },
                '& li': {
                  mb: 1,
                },
                '& blockquote': {
                  borderLeft: '4px solid',
                  borderColor: 'primary.light',
                  pl: 2,
                  py: 1,
                  my: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.03)',
                  borderRadius: 1,
                },
                '& code': {
                  fontFamily: '"Roboto Mono", monospace',
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  p: 0.5,
                  borderRadius: 0.5,
                  fontSize: '0.85em',
                },
                '& pre': {
                  bgcolor: 'rgba(0, 0, 0, 0.06)',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  '& code': {
                    bgcolor: 'transparent',
                    p: 0,
                  }
                },
                '& hr': {
                  my: 3,
                  border: 'none',
                  height: '1px',
                  bgcolor: 'divider',
                }
              }}
            >
              {value ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No content to preview
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MarkdownEditor; 