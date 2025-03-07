import React from 'react';
import { Alert, Box, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface RecalculationWarningProps {
  message: string;
  onRecalculate?: () => void;
  severity?: 'warning' | 'info' | 'error';
}

const RecalculationWarning: React.FC<RecalculationWarningProps> = ({
  message,
  onRecalculate,
  severity = 'warning'
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={severity}
        action={
          onRecalculate && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRecalculate}
            >
              Recalculate
            </Button>
          )
        }
      >
        {message}
      </Alert>
    </Box>
  );
};

export default RecalculationWarning; 