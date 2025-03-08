import { Card, CardContent, Typography, Slider, Box, Divider, Button, Grid, IconButton } from '@mui/material';
import { Component, Case } from '../store/negotiationSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface NegotiationIssueCardProps {
  component: Component;
  onChange?: (updatedComponent: Component) => void;
  readOnly?: boolean;
  case: Case;
  onUpdate: (updatedCase: Case) => void;
  showDiff?: boolean;
  hasChanges?: boolean;
  onAcceptChange?: () => void;
  onRejectChange?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const NegotiationIssueCard = ({ 
  component, 
  onChange, 
  readOnly = false,
  case: currentCase,
  showDiff = false,
  hasChanges = false,
  onAcceptChange,
  onRejectChange,
  onMoveUp,
  onMoveDown
}: NegotiationIssueCardProps) => {
  // Use suggestedParties instead of party1/party2
  const party1Name = currentCase.suggestedParties[0]?.name || 'Party 1';
  const party2Name = currentCase.suggestedParties[1]?.name || 'Party 2';

  const handleChange = (party: 'party1' | 'party2', type: 'redline' | 'bottomline', value: string) => {
    if (onChange) {
      const updatedComponent = { ...component };
      if (party === 'party1' && type === 'redline') {
        updatedComponent.redlineParty1 = value;
      } else if (party === 'party1' && type === 'bottomline') {
        updatedComponent.bottomlineParty1 = value;
      } else if (party === 'party2' && type === 'redline') {
        updatedComponent.redlineParty2 = value;
      } else if (party === 'party2' && type === 'bottomline') {
        updatedComponent.bottomlineParty2 = value;
      }
      onChange(updatedComponent);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            {component.name}
          </Typography>
          
          {(onMoveUp || onMoveDown) && (
            <Box>
              {onMoveUp && (
                <IconButton size="small" onClick={onMoveUp}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              )}
              {onMoveDown && (
                <IconButton size="small" onClick={onMoveDown}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {component.description}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          {party1Name}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Redline
          </Typography>
          <Typography variant="body1" paragraph>
            {component.redlineParty1 || 'Not set'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Bottomline
          </Typography>
          <Typography variant="body1" paragraph>
            {component.bottomlineParty1 || 'Not set'}
          </Typography>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom>
          {party2Name}
        </Typography>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Redline
          </Typography>
          <Typography variant="body1" paragraph>
            {component.redlineParty2 || 'Not set'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Bottomline
          </Typography>
          <Typography variant="body1" paragraph>
            {component.bottomlineParty2 || 'Not set'}
          </Typography>
        </Box>
        
        {showDiff && hasChanges && onAcceptChange && onRejectChange && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<CancelIcon />}
              onClick={onRejectChange}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={onAcceptChange}
            >
              Accept
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default NegotiationIssueCard; 