import React from 'react';
import { IconButton, Tooltip, Box, Divider } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LayersClearIcon from '@mui/icons-material/LayersClear';

interface ClearButtonsProps {
  // Optional callback after clearing chat history
  onClearChat?: () => void;
  // Optional callback after clearing interface state
  onClearInterface?: () => void;
  // Style overrides
  className?: string;
}

/**
 * Clear buttons component for nav bar use: icon buttons with tooltips
 */
const ClearButtons: React.FC<ClearButtonsProps> = ({ 
  onClearChat, 
  onClearInterface,
  className = ''
}) => {
  return (
    <Box className={className} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title="Clear Chat History">
        <IconButton
          onClick={onClearChat}
          size="small"
          color="default"
          sx={{
            transition: 'background 0.2s',
            '&:hover': { bgcolor: 'error.light', color: 'error.main' },
          }}
        >
          <DeleteSweepIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Clear Interface Content">
        <IconButton
          onClick={onClearInterface}
          size="small"
          color="default"
          sx={{
            transition: 'background 0.2s',
            '&:hover': { bgcolor: 'warning.light', color: 'warning.main' },
          }}
        >
          <LayersClearIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {/* Optional: vertical divider for nav bar separation */}
      <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
    </Box>
  );
};

export default ClearButtons; 