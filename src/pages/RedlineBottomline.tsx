import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  TextField,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { RootState } from '../store';
import {
  updateComponent,
  Component,
} from '../store/negotiationSlice';

/**
 * RedlineBottomline component for setting redlines and bottomlines for each component
 */
const RedlineBottomline = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux state
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  
  // Local state
  const [components, setComponents] = useState<Component[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Load components from Redux when component mounts
  useEffect(() => {
    if (!currentCase || !currentCase.analysis) {
      navigate('/');
      return;
    }
    
    setComponents(currentCase.analysis.components);
  }, [currentCase, navigate]);
  
  /**
   * Updates a component's redline or bottomline
   */
  const handleComponentUpdate = useCallback((
    componentId: string,
    field: 'redlineParty1' | 'bottomlineParty1' | 'redlineParty2' | 'bottomlineParty2',
    value: string
  ) => {
    const updatedComponents = components.map(component => {
      if (component.id === componentId) {
        return {
          ...component,
          [field]: value
        };
      }
      return component;
    });
    
    setComponents(updatedComponents);
    
    // Find the updated component and dispatch to Redux
    const updatedComponent = updatedComponents.find(c => c.id === componentId);
    if (updatedComponent) {
      dispatch(updateComponent(updatedComponent));
    }
  }, [components, dispatch]);
  
  /**
   * Validates that all components have redlines and bottomlines
   */
  const validateComponents = useCallback(() => {
    for (const component of components) {
      if (!component.redlineParty1 || !component.bottomlineParty1 || 
          !component.redlineParty2 || !component.bottomlineParty2) {
        return false;
      }
    }
    return true;
  }, [components]);
  
  /**
   * Navigates to the next page
   */
  const handleNext = useCallback(() => {
    if (!validateComponents()) {
      setError('Please fill in all redlines and bottomlines before proceeding.');
      return;
    }
    
    setError(null);
    navigate('/scenarios');
  }, [navigate, validateComponents]);
  
  /**
   * Renders a component card with redline and bottomline inputs
   */
  const renderComponentCard = useCallback((component: Component) => {
    const party1 = currentCase?.suggestedParties?.[0]?.name || 'Party 1';
    const party2 = currentCase?.suggestedParties?.[1]?.name || 'Party 2';
    
    return (
      <Accordion key={component.id} defaultExpanded>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel-${component.id}-content`}
          id={`panel-${component.id}-header`}
        >
          <Typography variant="h6">{component.name}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              {component.description}
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                {party1}
              </Typography>
              
              <TextField
                fullWidth
                label="Redline (won't accept worse than this)"
                value={component.redlineParty1 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'redlineParty1', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
              
              <TextField
                fullWidth
                label="Bottomline (willing to accept this)"
                value={component.bottomlineParty1 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'bottomlineParty1', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                {party2}
              </Typography>
              
              <TextField
                fullWidth
                label="Redline (won't accept worse than this)"
                value={component.redlineParty2 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'redlineParty2', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
              
              <TextField
                fullWidth
                label="Bottomline (willing to accept this)"
                value={component.bottomlineParty2 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'bottomlineParty2', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  }, [currentCase, handleComponentUpdate]);
  
  // If no case is available, don't render anything
  if (!currentCase || !currentCase.analysis) {
    return null;
  }
  
  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Redlines and Bottomlines
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" paragraph>
            For each component, define the redlines (positions beyond which you won't accept) 
            and bottomlines (positions you're willing to accept) for both parties.
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Redlines" 
                secondary="The position beyond which a party will not accept. This is their absolute minimum requirement." 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Bottomlines" 
                secondary="The position a party is willing to accept, though it's not their ideal outcome." 
              />
            </ListItem>
          </List>
        </Box>
        
        {components.map(renderComponentCard)}
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            disabled={!validateComponents()}
          >
            Continue to Scenarios
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RedlineBottomline; 