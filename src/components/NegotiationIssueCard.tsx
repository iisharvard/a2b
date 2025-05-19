import { Card, CardContent, Typography, Box, Divider, Button, IconButton } from '@mui/material';
import { Component, Case } from '../store/negotiationSlice';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface NegotiationIssueCardProps {
  component: Component;
  onChange?: (updatedComponent: Component) => void;
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
        
        {/* Redlines Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>
            Redlines
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {party1Name}
              </Typography>
              <Typography variant="body1">
                {component.redlineParty1 || 'Not set'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {party2Name}
              </Typography>
              <Typography variant="body1">
                {component.redlineParty2 || 'Not set'}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Bottomlines Section */}
        <Box sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.05)', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
            Bottomlines
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {party1Name}
              </Typography>
              <Typography variant="body1">
                {component.bottomlineParty1 || 'Not set'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {party2Name}
              </Typography>
              <Typography variant="body1">
                {component.bottomlineParty2 || 'Not set'}
              </Typography>
            </Box>
          </Box>
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