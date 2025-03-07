import React, { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DiffIcon from '@mui/icons-material/DifferenceOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DiffViewer from './DiffViewer';

interface RecalculationWarningProps {
  message: string;
  onRecalculate?: () => void;
  severity?: 'warning' | 'info' | 'error';
  showDiff?: boolean;
  diffTitle?: string;
  originalItems?: any[];
  updatedItems?: any[];
  idKey?: string;
  nameKey?: string;
}

const RecalculationWarning: React.FC<RecalculationWarningProps> = ({
  message,
  onRecalculate,
  severity = 'warning',
  showDiff = false,
  diffTitle = 'Changes',
  originalItems = [],
  updatedItems = [],
  idKey = 'id',
  nameKey = 'name'
}) => {
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const handleOpenDiffDialog = () => {
    setDiffDialogOpen(true);
  };
  
  const handleCloseDiffDialog = () => {
    setDiffDialogOpen(false);
  };
  
  const handleRecalculate = async () => {
    if (!onRecalculate) return;
    
    setIsRecalculating(true);
    try {
      await onRecalculate();
    } finally {
      setIsRecalculating(false);
      if (diffDialogOpen) {
        handleCloseDiffDialog();
      }
    }
  };
  
  const handleDismiss = () => {
    setDismissed(true);
  };
  
  if (dismissed) {
    return null;
  }
  
  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={severity}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {showDiff && (
              <Button
                color="inherit"
                size="small"
                startIcon={<DiffIcon />}
                onClick={handleOpenDiffDialog}
                sx={{ mr: 1 }}
                disabled={isRecalculating}
              >
                View Changes
              </Button>
            )}
            {onRecalculate && (
              <Button
                color="inherit"
                size="small"
                startIcon={isRecalculating ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRecalculate}
                disabled={isRecalculating}
                sx={{ mr: 1 }}
              >
                {isRecalculating ? 'Recalculating...' : 'Recalculate'}
              </Button>
            )}
            <IconButton
              size="small"
              color="inherit"
              onClick={handleDismiss}
              disabled={isRecalculating}
              aria-label="close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        {message}
      </Alert>
      
      {showDiff && (
        <Dialog 
          open={diffDialogOpen} 
          onClose={handleCloseDiffDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {diffTitle}
          </DialogTitle>
          <DialogContent>
            <DiffViewer
              title={diffTitle}
              originalItems={originalItems}
              updatedItems={updatedItems}
              idKey={idKey}
              nameKey={nameKey}
              showDetails={true}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDiffDialog} disabled={isRecalculating}>Close</Button>
            {onRecalculate && (
              <Button 
                onClick={handleRecalculate} 
                variant="contained"
                disabled={isRecalculating}
                startIcon={isRecalculating ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {isRecalculating ? 'Recalculating...' : 'Recalculate'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default RecalculationWarning; 