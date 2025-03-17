import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const generationIntervalRef = useRef<number | null>(null);
  const [autoGenerateActive, setAutoGenerateActive] = useState(false);
  const maxScenariosToGenerate = 5; // Maximum number of scenarios to generate
  
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

  // Clear interval when component unmounts
  useEffect(() => {
    return () => {
      if (generationIntervalRef.current) {
        window.clearInterval(generationIntervalRef.current);
      }
    };
  }, []);

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

      // Start auto-generation of scenarios
      handleAutoGenerateScenarios();
    };

    fetchScenarios();
  }, [selectedIssueId, currentCase, recalculationStatus.scenariosRecalculated]);

  /**
   * Automatically generate scenarios one by one
   */
  const handleAutoGenerateScenarios = useCallback(() => {
    if (!selectedIssueId || isGenerating || autoGenerateActive) return;
    
    setError(null);
    setIsGenerating(true);
    setAutoGenerateActive(true);
    setCurrentScenarioIndex(0);
    
    // Clear any existing interval
    if (generationIntervalRef.current) {
      window.clearInterval(generationIntervalRef.current);
    }
    
    // Clear loaded scenarios for this component
    setLoadedScenarios(prev => prev.filter(id => {
      const scenario = currentCase?.scenarios.find(s => s.id === id);
      return scenario?.componentId !== selectedIssueId;
    }));
    
    // Start with an empty array of scenarios for this component
    dispatch(setScenarios(currentCase?.scenarios.filter(
      s => s.componentId !== selectedIssueId
    ) || []));
    
    // Generate the first scenario
    generateNextScenario();
  }, [selectedIssueId, isGenerating, autoGenerateActive, currentCase, dispatch]);

  /**
   * Generate the next scenario in sequence
   */
  const generateNextScenario = useCallback(async () => {
    if (!selectedIssueId || !currentCase) return;
    
    try {
      console.log(`Generating scenario ${currentScenarioIndex + 1} for issue: ${selectedIssueId}`);
      
      const component = currentCase.analysis?.components.find(c => c.id === selectedIssueId);
      if (!component) throw new Error(`Component not found: ${selectedIssueId}`);
      
      // Create a unique ID for this scenario
      const scenarioId = `${selectedIssueId}-${Date.now()}-${currentScenarioIndex}`;
      
      // Generate a single scenario
      const scenarioType = getSingleScenarioType(currentScenarioIndex);
      const result = await api.generateSingleScenario(selectedIssueId, scenarioType);
      
      if (!result || 'rateLimited' in result) {
        throw new Error('Rate limit reached or empty response');
      }
      
      // Create the new scenario
      const newScenario: Scenario = {
        id: scenarioId,
        componentId: selectedIssueId,
        type: scenarioType,
        description: result.description || `Scenario ${currentScenarioIndex + 1}`
      };
      
      // Add to loaded scenarios
      setLoadedScenarios(prev => [...prev, scenarioId]);
      
      // Update Redux store with the new scenario
      dispatch(setScenarios([...currentCase.scenarios, newScenario]));
      
      // Increment the index
      setCurrentScenarioIndex(prev => prev + 1);
      
      // Check if we've generated all the scenarios
      if (currentScenarioIndex >= maxScenariosToGenerate - 1) {
        // We're done generating scenarios
        setIsGenerating(false);
        setAutoGenerateActive(false);
        
        // Mark scenarios as recalculated if they were generated due to analysis changes
        if (!recalculationStatus.scenariosRecalculated) {
          dispatch(setScenariosRecalculated(true));
        }
      } else {
        // Schedule the next scenario generation after a short delay
        setTimeout(() => {
          generateNextScenario();
        }, 1000); // 1-second delay between generations
      }
    } catch (err: any) {
      console.error(`Error generating scenario for issue ${selectedIssueId}:`, err);
      setError(err.message?.includes('rate limit') ? 
        'Rate limit reached. Please wait a moment before trying again.' : 
        'Failed to generate scenario. Please try again.');
      setIsGenerating(false);
      setAutoGenerateActive(false);
    }
  }, [selectedIssueId, currentCase, currentScenarioIndex, dispatch, recalculationStatus.scenariosRecalculated]);

  /**
   * Get a scenario type based on the index in the sequence
   */
  const getSingleScenarioType = (index: number): 'redline_violated_p1' | 'bottomline_violated_p1' | 'agreement_area' | 'bottomline_violated_p2' | 'redline_violated_p2' => {
    const types = [
      'redline_violated_p1',
      'bottomline_violated_p1',
      'agreement_area',
      'bottomline_violated_p2',
      'redline_violated_p2'
    ] as const;
    return types[index % types.length];
  };

  const handleIssueChange = (issueId: string) => {
    setSelectedIssueId(issueId);
  };

  const handleSelectScenario = (scenario: Scenario) => {
    dispatch(selectScenario(scenario));
  };

  const handleGenerateScenarios = async () => {
    // Call the auto-generate function to start the generation sequence
    handleAutoGenerateScenarios();
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