import { useState, useEffect, useCallback, useRef } from 'react';
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
  Card,
  CardContent,
  ListItemButton,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { RootState } from '../store';
import CopyButton from '../components/CopyButton';
import { 
  updateComponent,
  Component,
  updateComponents
} from '../store/negotiationSlice';
import { api } from '../services/api';
import { useLogging } from '../contexts/LoggingContext';
import { debounce } from '../utils/debounce';
import { truncateText } from '../utils/textUtils';

/**
 * RedlineBottomline component for setting redlines and bottomlines for each component
 */
const RedlineBottomline = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logger, isLoggingInitialized } = useLogging();
  
  // Redux state
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  
  // Local state
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationSuccess, setRecalculationSuccess] = useState<string | null>(null);
  const componentsRef = useRef<Component[]>([]);

  // Create a debounced version of the logging function for boundary edits
  const debouncedLogBoundaryEdit = useCallback(
    debounce((componentId: string, field: string, value: string, caseId: string, componentToLog: Component | undefined) => {
      if (isLoggingInitialized && logger && componentToLog) {
        // Log a snapshot of the specific component's boundaries
        const contentToLog = {
          id: componentToLog.id,
          name: componentToLog.name,
          redlineParty1: componentToLog.redlineParty1,
          bottomlineParty1: componentToLog.bottomlineParty1,
          redlineParty2: componentToLog.redlineParty2,
          bottomlineParty2: componentToLog.bottomlineParty2,
        };
        logger.logFramework(
          'Redline',
          'edit',
          {
            inputSize: value.length,
            wasEdited: true,
            frameworkContent: truncateText(JSON.stringify(contentToLog))
          },
          caseId
        ).catch(err => console.error(`Error logging debounced boundary edit for ${componentId}-${field}:`, err));
      }
    }, 1500),
    [isLoggingInitialized, logger]
  );

  // Load components from Redux when component mounts or when currentCase changes
  useEffect(() => {
    if (!currentCase || !currentCase.analysis) {
      navigate('/');
      return;
    }
    
    const comps = currentCase.analysis.components;
    setComponents(comps);
    componentsRef.current = comps;
    
    // Select the first component by default
    if (comps.length > 0 && !selectedComponentId) {
      setSelectedComponentId(comps[0].id);
    }
  }, [currentCase, navigate, selectedComponentId]);

  // Sync components when descriptions change but maintain existing redlines/bottomlines
  useEffect(() => {
    if (!currentCase || !currentCase.analysis) return;
    
    const newComponents = currentCase.analysis.components;
    const currentComponents = componentsRef.current;
    
    // Skip if there are no components to compare
    if (!currentComponents.length || !newComponents.length) return;
    
    // Create maps for fast lookups
    const currentComponentsById = new Map<string, Component>();
    currentComponents.forEach(comp => {
      currentComponentsById.set(comp.id, comp);
    });
    
    const newComponentsById = new Map<string, Component>();
    newComponents.forEach(comp => {
      newComponentsById.set(comp.id, comp);
    });
    
    // Check if any component name or description has changed
    let hasChanges = false;
    
    // Compare component arrays by name and description
    for (const id of newComponentsById.keys()) {
      const newComp = newComponentsById.get(id);
      const currentComp = currentComponentsById.get(id);
      
      if (!newComp || !currentComp) {
        hasChanges = true;
        break;
      }
      
      if (newComp.name !== currentComp.name || 
          newComp.description !== currentComp.description) {
        hasChanges = true;
        break;
      }
    }
    
    // If the number of components changed, that's also a change
    if (newComponents.length !== currentComponents.length) {
      hasChanges = true;
    }
    
    if (hasChanges) {
      // Merge the new component data (names, descriptions) with existing redlines/bottomlines
      const mergedComponents = newComponents.map(newComp => {
        const existingComp = currentComponentsById.get(newComp.id);
        if (!existingComp) return newComp;
        
        return {
          ...newComp,
          // Preserve existing boundaries if they exist
          redlineParty1: existingComp.redlineParty1 || newComp.redlineParty1,
          bottomlineParty1: existingComp.bottomlineParty1 || newComp.bottomlineParty1,
          redlineParty2: existingComp.redlineParty2 || newComp.redlineParty2,
          bottomlineParty2: existingComp.bottomlineParty2 || newComp.bottomlineParty2,
        };
      });
      
      // Update local state
      setComponents(mergedComponents);
      componentsRef.current = mergedComponents;
      
      // Update Redux store with the merged components to ensure descriptions propagate
      dispatch(updateComponents(mergedComponents));
    }
  }, [currentCase, dispatch]);

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
    componentsRef.current = updatedComponents;
    
    // Find the updated component and dispatch to Redux
    const updatedComponent = updatedComponents.find(c => c.id === componentId);
    if (updatedComponent) {
      dispatch(updateComponent(updatedComponent));
      const caseId = logger?.getCaseId(true);
      if (caseId) {
        // Pass the updatedComponent for logging its state
        debouncedLogBoundaryEdit(componentId, field, value, caseId, updatedComponent);
      }
    }
  }, [components, dispatch, debouncedLogBoundaryEdit, logger]);
  
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
   * Handle recalculating boundaries only
   */
  const handleRecalculateBoundaries = useCallback(async () => {
    if (!currentCase || !currentCase.analysis) return;
    
    try {
      setIsRecalculating(true);
      setError(null);
      setRecalculationSuccess(null);
      
      // Create a temporary analysis object with current data to ensure latest components are used
      const currentAnalysis = {
        ...currentCase.analysis,
        components: components
      };
      
      // Call the API to recalculate boundaries
      const updatedComponents = await api.recalculateBoundaries(currentAnalysis);
      
      // Update the local state
      setComponents(updatedComponents);
      componentsRef.current = updatedComponents;
      
      // Update Redux store
      dispatch(updateComponents(updatedComponents));
      
      setRecalculationSuccess('Boundaries recalculated successfully.');

      if (isLoggingInitialized && logger && logger.getCaseId(true)) {
        logger.logFramework(
          'Redline',
          'generate',
          {
            inputSize: components.reduce((sum, c) => sum + (c.description?.length || 0), 0),
            wasEdited: false,
            frameworkContent: truncateText(JSON.stringify(updatedComponents)) // Log all recalculated components
          },
          logger.getCaseId(true)
        ).catch(err => console.error('Error logging boundaries recalculation:', err));
      }
    } catch (err) {
      console.error('Error recalculating boundaries:', err);
      setError('Failed to recalculate boundaries. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  }, [currentCase, components, dispatch, isLoggingInitialized, logger]);
  
  /**
   * Renders a component card with redline and bottomline inputs
   */
  const renderComponentCard = useCallback((component: Component) => {
    const party1 = currentCase?.suggestedParties?.[0]?.name || 'Party 1';
    const party2 = currentCase?.suggestedParties?.[1]?.name || 'Party 2';
    
    return (
      <Box key={component.id}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            {component.name}
          </Typography>
          <Typography variant="body1" gutterBottom>
            {component.description}
          </Typography>
        </Box>
        
        {/* Redline Section - Both parties */}
        <Box sx={{ mb: 4, p: 2, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
            Redlines (won't accept worse than this)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                {party1}
              </Typography>
              <TextField
                fullWidth
                value={component.redlineParty1 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'redlineParty1', e.target.value)}
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
                value={component.redlineParty2 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'redlineParty2', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </Box>
        
        {/* Bottomline Section - Both parties */}
        <Box sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.05)', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Bottomlines (willing to accept this)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                {party1}
              </Typography>
              <TextField
                fullWidth
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
                value={component.bottomlineParty2 || ''}
                onChange={(e) => handleComponentUpdate(component.id, 'bottomlineParty2', e.target.value)}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }, [currentCase, handleComponentUpdate]);
  
  /**
   * Renders the component selection panel
   */
  const renderComponentSelectionPanel = useCallback(() => {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Issue
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List component="nav" aria-label="component selection">
            {components.map((component) => {
              // Check if this component has all fields filled
              const isComplete = 
                !!component.redlineParty1 && 
                !!component.bottomlineParty1 && 
                !!component.redlineParty2 && 
                !!component.bottomlineParty2;
              
              return (
                <ListItemButton
                  key={component.id}
                  selected={selectedComponentId === component.id}
                  onClick={() => setSelectedComponentId(component.id)}
                  sx={{
                    borderLeft: selectedComponentId === component.id 
                      ? '4px solid #1976d2' 
                      : '4px solid transparent',
                    bgcolor: isComplete ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: isComplete ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemText 
                    primary={component.name} 
                    secondary={isComplete ? "Complete" : "Incomplete"}
                    primaryTypographyProps={{
                      fontWeight: selectedComponentId === component.id ? 'bold' : 'normal',
                    }}
                    secondaryTypographyProps={{
                      color: isComplete ? 'success.main' : 'error.main',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </CardContent>
      </Card>
    );
  }, [components, selectedComponentId]);
  
  // If no case is available, don't render anything
  if (!currentCase || !currentCase.analysis) {
    return null;
  }

  // Get the selected component
  const selectedComponent = components.find(c => c.id === selectedComponentId);

  // Function to generate copyable text content for boundaries
  const generateCopyText = (): string => {
    // Get party names from the current case
    const party1Name = currentCase?.suggestedParties && currentCase.suggestedParties.length > 0 ? 
      currentCase.suggestedParties[0].name : "Party 1";
    const party2Name = currentCase?.suggestedParties && currentCase.suggestedParties.length > 1 ? 
      currentCase.suggestedParties[1].name : "Party 2";
      
    let text = "REDLINES AND BOTTOMLINES\n\n";
    
    components.forEach((component) => {
      text += `ISSUE: ${component.name}\n`;
      text += `Description: ${component.description}\n\n`;
      
      text += "REDLINES (won't accept worse than this):\n";
      text += `${party1Name}: ${component.redlineParty1 || 'Not set'}\n`;
      text += `${party2Name}: ${component.redlineParty2 || 'Not set'}\n\n`;
      
      text += "BOTTOMLINES (willing to accept this):\n";
      text += `${party1Name}: ${component.bottomlineParty1 || 'Not set'}\n`;
      text += `${party2Name}: ${component.bottomlineParty2 || 'Not set'}\n\n`;
      
      text += "---------------------\n\n";
    });
    
    return text;
  };

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mr: 2 }}>
            Redlines and Bottomlines
          </Typography>
          <CopyButton 
            text={generateCopyText()}
            tooltipTitle="Copy Boundaries to clipboard"
            color="primary"
          />
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {recalculationSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {recalculationSuccess}
          </Alert>
        )}
        
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleRecalculateBoundaries}
            disabled={isRecalculating}
            startIcon={isRecalculating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            sx={{ 
              fontSize: '0.9rem',
              minWidth: '160px'
            }}
          >
            {isRecalculating ? 'Recalculating...' : 'Recalculate Boundaries'}
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {renderComponentSelectionPanel()}
          </Grid>
          <Grid item xs={12} md={9}>
            {selectedComponent && renderComponentCard(selectedComponent)}
          </Grid>
        </Grid>

{/* 
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
        </Box> */}
        
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