import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface ExperimentalWarningDialogProps {
  open: boolean;
  onClose: () => void;
}

const ExperimentalWarningDialog: React.FC<ExperimentalWarningDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">Experimental Interface Warning</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          This interface is experimental and under constant development. Please be aware of the following:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2" paragraph>
            All features and functionality are subject to change without notice
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            Any information you submit may be lost during updates or changes
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            There are no guarantees regarding privacy or confidentiality of your data
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            The system is provided "as is" without any warranties
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Please use this interface at your own discretion and risk.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExperimentalWarningDialog; 