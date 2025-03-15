import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Collapse,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Card,
  CardContent,
  ListItemButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RootState } from '../store';
import { 
  setScenarios, 
  selectScenario, 
  Scenario
} from '../store/negotiationSlice';
import { 
  setScenariosRecalculated
} from '../store/recalculationSlice';
import { api } from '../services/api';
import ScenarioSpectrum from '../components/ScenarioSpectrum';
import RecalculationWarning from '../components/RecalculationWarning';

const NegotiationScenario = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentCase, selectedScenario } = useSelector(
    (state: RootState) => state.negotiation
  );
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [loadedScenarios, setLoadedScenarios] = useState<string[]>([]);
  
  // Get filtered scenarios for the selected issue
  const filteredScenarios = currentCase?.scenarios.filter(
    s => s.componentId === selectedIssueId
  ) || [];

  // Check if analysis has been recalculated but scenarios haven't been updated
  const needsRecalculation = !recalculationStatus.scenariosRecalculated && 
    recalculationStatus.analysisRecalculated;

  useEffect(() => {
    if (!currentCase || !currentCase.analysis) {
      navigate('/boundaries');
      return;
    }

    // Set the first component as selected by default
    if (currentCase.analysis.components.length > 0 && !selectedIssueId) {
      setSelectedIssueId(currentCase.analysis.components[0].id);
    }
  }, [currentCase, navigate, selectedIssueId]);

  // Use a separate effect for scenario generation to prevent infinite loops
  useEffect(() => {
    // Skip if no issue selected
    if (!selectedIssueId || !currentCase) {
      return;
    }

    const fetchScenarios = async () => {
      // Check if we already have scenarios for this issue in Redux
      const existingScenarios = currentCase.scenarios.filter(
        (s) => s.componentId === selectedIssueId
      );
      
      // If we have scenarios and they don't need recalculation, use them
      if (existingScenarios.length > 0 && recalculationStatus.scenariosRecalculated) {
        console.log(`Using existing scenarios for issue: ${selectedIssueId}`);
        // Mark all existing scenarios as loaded
        setLoadedScenarios(prev => {
          const newLoaded = [...prev];
          existingScenarios.forEach(scenario => {
            if (!newLoaded.includes(scenario.id)) {
              newLoaded.push(scenario.id);
            }
          });
          return newLoaded;
        });
        return;
      }

      // Only proceed with generation if we need to
      setIsGenerating(true);
      setError(null);
      
      try {
        console.log(`Starting scenario generation for issue: ${selectedIssueId}`);
        
        // Use regular generateScenarios instead of forceGenerateScenarios to use cache if available
        const newScenarios = await api.generateScenarios(selectedIssueId, (scenario) => {
          // Mark each scenario as loaded as it comes in
          setLoadedScenarios(prev => [...prev, scenario.id]);
        });
        
        // Ensure newScenarios is an array
        const scenariosArray = Array.isArray(newScenarios) ? newScenarios : [];
        console.log(`Generated ${scenariosArray.length} scenarios for issue: ${selectedIssueId}`);
        
        dispatch(setScenarios(scenariosArray));
        
        // Mark scenarios as recalculated if they were generated due to analysis changes
        if (!recalculationStatus.scenariosRecalculated) {
          dispatch(setScenariosRecalculated(true));
        }
      } catch (err: any) {
        if (err.message?.includes('rate limit')) {
          setError('Rate limit reached. Please wait a moment before trying again.');
        } else {
          console.error(`Error generating scenarios for issue ${selectedIssueId}:`, err);
          setError('Failed to fetch scenarios. Please try again.');
        }
      } finally {
        setIsGenerating(false);
      }
    };

    fetchScenarios();
  }, [selectedIssueId, currentCase, dispatch, recalculationStatus.scenariosRecalculated]);

  // Debug effect for selected scenario
  useEffect(() => {
    console.log('selectedScenario:', selectedScenario?.id);
  }, [selectedScenario]);

  const handleIssueChange = (issueId: string) => {
    setSelectedIssueId(issueId);
    // Reset selected scenario when changing issues
    dispatch(selectScenario(null));
  };

  const handleSelectScenario = (scenario: Scenario) => {
    console.log('Selecting scenario:', scenario.id);
    
    if (selectedScenario && selectedScenario.id === scenario.id) {
      // If clicking the same scenario, deselect it
      console.log('Deselecting current scenario');
      dispatch(selectScenario(null));
    } else {
      // If selecting a different scenario
      console.log('Selecting new scenario, previous:', selectedScenario?.id);
      dispatch(selectScenario(scenario));
    }
  };

  const handleGenerateScenarios = async () => {
    if (!selectedIssueId || isGenerating) return;
    
    setError(null);
    setIsGenerating(true);
    // Clear loaded scenarios for this component
    setLoadedScenarios(prev => prev.filter(id => {
      const scenario = currentCase?.scenarios.find(s => s.id === id);
      return scenario?.componentId !== selectedIssueId;
    }));
    
    try {
      console.log(`Manually triggering scenario generation for issue: ${selectedIssueId}`);
      
      // Force regenerate scenarios
      const generatedScenarios = await api.forceGenerateScenarios(selectedIssueId, (scenario) => {
        // Mark each scenario as loaded as it comes in
        setLoadedScenarios(prev => [...prev, scenario.id]);
      });
      
      // Ensure generatedScenarios is an array
      const scenariosArray = Array.isArray(generatedScenarios) ? generatedScenarios : [];
      console.log(`Generated ${scenariosArray.length} scenarios for issue: ${selectedIssueId}`);
      
      dispatch(setScenarios(scenariosArray));
    } catch (err) {
      console.error(`Error manually generating scenarios for issue ${selectedIssueId}:`, err);
      setError('Failed to generate scenarios. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    navigate('/');
  };

  const handleUpdateScenario = (updatedScenario: Scenario) => {
    if (!currentCase) return;
    
    // Update the scenario in the scenarios array
    const updatedScenarios = currentCase.scenarios.map(scenario => 
      scenario.id === updatedScenario.id ? updatedScenario : scenario
    );
    
    // Update Redux store
    dispatch(setScenarios(updatedScenarios));
  };

  if (!currentCase || !currentCase.analysis) {
    return null; // Will redirect in useEffect
  }

  const selectedIssue = currentCase.analysis.components.find(
    (c) => c.id === selectedIssueId
  );

  // Get party names for display
  const party1Name = currentCase?.suggestedParties[0]?.name || 'Party 1';
  const party2Name = currentCase?.suggestedParties[1]?.name || 'Party 2';

  /**
   * Renders the issue selection panel
   */
  const renderIssueSelectionPanel = () => {
    if (!currentCase || !currentCase.analysis) return null;
    
    return (
      <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            Select Issue
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List component="nav" aria-label="issue selection" sx={{ px: 0 }}>
            {currentCase.analysis.components.map((component) => {
              // Check if this component has scenarios
              const hasScenarios = currentCase.scenarios.some(s => s.componentId === component.id);
              
              return (
                <ListItemButton
                  key={component.id}
                  selected={selectedIssueId === component.id}
                  onClick={() => handleIssueChange(component.id)}
                  sx={{
                    borderLeft: selectedIssueId === component.id 
                      ? '4px solid #1976d2' 
                      : '4px solid transparent',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: hasScenarios ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
                    '&:hover': {
                      bgcolor: hasScenarios ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(25, 118, 210, 0.12)',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.18)',
                      },
                    },
                  }}
                >
                  <ListItemText 
                    primary={component.name} 
                    secondary={hasScenarios ? "Scenarios available" : "No scenarios yet"}
                    primaryTypographyProps={{
                      fontWeight: selectedIssueId === component.id ? 'bold' : 'medium',
                      fontSize: '0.95rem',
                    }}
                    secondaryTypographyProps={{
                      color: hasScenarios ? 'success.main' : 'text.secondary',
                      fontSize: '0.8rem',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
          Negotiation Scenarios
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert 
            severity={error.includes('successfully') ? 'success' : 'error'} 
            sx={{ mb: 3, borderRadius: 1 }}
            variant="filled"
          >
            {error}
          </Alert>
        )}
        
        {needsRecalculation && (
          <RecalculationWarning
            message="The analysis has been modified. The scenarios may not reflect the latest changes."
            onRecalculate={handleGenerateScenarios}
          />
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {renderIssueSelectionPanel()}
          </Grid>
          
          <Grid item xs={12} md={9}>
            {selectedIssueId ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', mb: 1 }}>
                    {selectedIssue?.name} Scenarios
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.9rem' }}>
                    Click on a scenario to select it. Click the edit icon to modify a scenario's description.
                  </Typography>
                  
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGenerateScenarios}
                      disabled={isGenerating}
                      startIcon={isGenerating ? <CircularProgress size={16} /> : null}
                      size="medium"
                      sx={{ 
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 'medium',
                        boxShadow: 2
                      }}
                    >
                      {isGenerating ? 'Generating...' : 'Regenerate Scenarios'}
                    </Button>
                  </Box>
                  
                  <ScenarioSpectrum
                    scenarios={filteredScenarios}
                    party1Name={party1Name}
                    party2Name={party2Name}
                    onSelectScenario={handleSelectScenario}
                    onUpdateScenario={handleUpdateScenario}
                    selectedScenarioId={selectedScenario?.id}
                    loadedScenarios={loadedScenarios}
                  />
                </Box>
              </>
            ) : (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Select an issue from the list to view its scenarios
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default NegotiationScenario; 