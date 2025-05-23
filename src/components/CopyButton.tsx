import React, { useState } from 'react';
import { IconButton, Tooltip, Snackbar } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface CopyButtonProps {
  text: string;
  tooltipTitle?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'default';
}

/**
 * A reusable button component for copying text to clipboard
 */
const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  tooltipTitle = 'Copy to clipboard',
  className = '',
  size = 'small',
  color = 'default'
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarOpen(true);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
      });
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <IconButton 
          onClick={handleCopy} 
          size={size} 
          color={color}
          className={className}
          aria-label="copy to clipboard"
        >
          <ContentCopyIcon fontSize={size} />
        </IconButton>
      </Tooltip>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        message="Copied to clipboard"
      />
    </>
  );
};

export default CopyButton;
