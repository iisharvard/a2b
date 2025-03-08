import { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  height?: string;
  placeholder?: string;
}

const MarkdownEditor = ({ value, onChange, label, placeholder, height = '400px' }: MarkdownEditorProps) => {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Box sx={{ mb: 1, fontWeight: 'bold' }}>
          {label}
        </Box>
      )}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} aria-label="markdown editor tabs">
          <Tab label="Edit" />
          <Tab label="Preview" />
        </Tabs>
        <Box sx={{ p: 2, height, overflow: 'auto' }}>
          {tab === 0 ? (
            <CodeMirror
              value={value}
              height={height}
              onChange={(value) => onChange(value)}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
              }}
              placeholder={placeholder}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MarkdownEditor; 