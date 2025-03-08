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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RootState } from '../store';
import { 
  setScenarios, 
  selectScenario, 
  addRiskAssessment, 
  updateRiskAssessment, 
  setRiskAssessments,
  Scenario,
  RiskAssessment
} from '../store/negotiationSlice';
import { 
  setScenariosRecalculated,
  setRiskAssessmentsRecalculated 
} from '../store/recalculationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import ScenarioSpectrum from '../components/ScenarioSpectrum';
import RiskAssessmentTable from '../components/RiskAssessmentTable';
import RecalculationWarning from '../components/RecalculationWarning';

const NegotiationScenario = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentCase, selectedScenario } = useSelector(
    (state: RootState) => state.negotiation
  );
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [scenarios, setLocalScenarios] = useState<Scenario[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingRisk, setIsGeneratingRisk] = useState(false);
  const generationInProgress = useRef(false);
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
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
    // Skip if already generating or no issue selected
    if (generationInProgress.current || !selectedIssueId || !currentCase) {
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
        setLocalScenarios(existingScenarios);
        return;
      }

      // Only proceed with generation if we need to
      setIsGenerating(true);
      generationInProgress.current = true;
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Starting scenario generation for issue: ${selectedIssueId}`);
        
        // Use regular generateScenarios instead of forceGenerateScenarios to use cache if available
        const newScenarios = await api.generateScenarios(selectedIssueId);
        
        // Ensure newScenarios is an array
        const scenariosArray = Array.isArray(newScenarios) ? newScenarios : [];
        console.log(`Generated ${scenariosArray.length} scenarios for issue: ${selectedIssueId}`);
        
        setLocalScenarios(scenariosArray);
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
        setLocalScenarios([]);
      } finally {
        setLoading(false);
        setIsGenerating(false);
        generationInProgress.current = false;
      }
    };

    fetchScenarios();
  }, [selectedIssueId, currentCase, dispatch, recalculationStatus.scenariosRecalculated]);

  const handleIssueChange = (issueId: string) => {
    if (isGenerating) {
      setError('Please wait for the current scenario generation to complete');
      return;
    }
    setSelectedIssueId(issueId);
    // Reset selected scenario when changing issues
    dispatch(selectScenario(null));
    setShowRiskAssessment(false);
  };

  const handleSelectScenario = (scenario: Scenario) => {
    if (selectedScenario && selectedScenario.id === scenario.id) {
      dispatch(selectScenario(null));
      setShowRiskAssessment(false);
    } else {
      dispatch(selectScenario(scenario));
      setShowRiskAssessment(false);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!selectedIssueId || isGenerating) return;
    
    setLoading(true);
    setError(null);
    setIsGenerating(true);
    generationInProgress.current = true;
    
    try {
      console.log(`Manually triggering scenario generation for issue: ${selectedIssueId}`);
      
      // Force regenerate scenarios
      const generatedScenarios = await api.forceGenerateScenarios(selectedIssueId);
      
      // Ensure generatedScenarios is an array
      const scenariosArray = Array.isArray(generatedScenarios) ? generatedScenarios : [];
      console.log(`Generated ${scenariosArray.length} scenarios for issue: ${selectedIssueId}`);
      
      setLocalScenarios(scenariosArray);
      dispatch(setScenarios(scenariosArray));
    } catch (err) {
      console.error(`Error manually generating scenarios for issue ${selectedIssueId}:`, err);
      setError('Failed to generate scenarios. Please try again.');
    } finally {
      setLoading(false);
      setIsGenerating(false);
      generationInProgress.current = false;
    }
  };

  const handleGenerateRiskAssessment = async () => {
    if (!currentCase || !selectedScenario) {
      setError('Please select a scenario first.');
      return;
    }
    
    // If risk assessment is already showing, just toggle it off
    if (showRiskAssessment) {
      setShowRiskAssessment(false);
      return;
    }
    
    try {
      setIsGeneratingRisk(true);
      setError(null);
      
      // Check if risk assessment already exists for this scenario
      const existingRiskAssessment = currentCase.riskAssessments.find(
        (ra) => ra.scenarioId === selectedScenario.id
      );
      
      if (existingRiskAssessment) {
        // If risk assessment exists and scenarios have been recalculated, update it
        if (!recalculationStatus.riskAssessmentsRecalculated) {
          // Generate risk assessment
          const riskAssessment = await api.generateRiskAssessment(selectedScenario.id);
          
          // Update the existing risk assessment
          dispatch(updateRiskAssessment({
            ...riskAssessment,
            id: existingRiskAssessment.id
          }));
          
          // Mark risk assessments as recalculated
          dispatch(setRiskAssessmentsRecalculated(true));
        }
      } else {
        // Generate risk assessment
        const riskAssessment = await api.generateRiskAssessment(selectedScenario.id);
        
        // Add to Redux
        dispatch(setRiskAssessments([...currentCase.riskAssessments, riskAssessment]));
        
        // Mark risk assessments as recalculated
        dispatch(setRiskAssessmentsRecalculated(true));
      }
      
      // Show the risk assessment section
      setShowRiskAssessment(true);
    } catch (err) {
      console.error('Error generating risk assessment:', err);
      setError('Failed to generate risk assessment. Please try again.');
    } finally {
      setIsGeneratingRisk(false);
    }
  };

  const handleAddAssessment = (assessment: RiskAssessment) => {
    dispatch(addRiskAssessment(assessment));
  };

  const handleUpdateRiskAssessment = (assessment: RiskAssessment) => {
    dispatch(updateRiskAssessment(assessment));
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    if (!currentCase) return;
    
    const updatedAssessments = currentCase.riskAssessments.filter(
      (assessment) => assessment.id !== assessmentId
    );
    
    dispatch(setRiskAssessments(updatedAssessments));
  };

  const handleNext = () => {
    navigate('/');
  };

  // Function to handle recalculation of scenarios
  const handleRecalculateScenarios = async () => {
    if (!currentCase || !selectedIssueId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Force regenerate scenarios for the selected issue
      const generatedScenarios = await api.forceGenerateScenarios(selectedIssueId);
      
      // Update Redux store with new scenarios
      dispatch(setScenarios(generatedScenarios));
      
      // Mark scenarios as recalculated
      dispatch(setScenariosRecalculated(true));
      
      // Show success message
      setError('Scenarios have been successfully recalculated.');
      
      return generatedScenarios;
    } catch (err) {
      console.error('Error recalculating scenarios:', err);
      setError('Failed to recalculate scenarios. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (!currentCase || !currentCase.analysis) {
    return null; // Will redirect in useEffect
  }

  const selectedIssue = currentCase.analysis.components.find(
    (c) => c.id === selectedIssueId
  );

  // Get risk assessments for the selected scenario
  const scenarioRiskAssessments = selectedScenario 
    ? currentCase.riskAssessments.filter(ra => ra.scenarioId === selectedScenario.id)
    : [];

  // Get party names for display
  const party1Name = currentCase?.suggestedParties[0]?.name || 'Party 1';
  const party2Name = currentCase?.suggestedParties[1]?.name || 'Party 2';

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Negotiation Scenarios
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {needsRecalculation && (
          <RecalculationWarning
            message="The analysis has been modified. The scenarios may not reflect the latest changes."
            onRecalculate={handleRecalculateScenarios}
          />
        )}
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Select Issue
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose an issue to view its potential scenarios
              </Typography>
              
              <List dense sx={{ bgcolor: 'background.paper', border: '1px solid #eee', borderRadius: 1 }}>
                {currentCase.analysis.components.map((component) => (
                  <ListItem
                    key={component.id}
                    button
                    selected={selectedIssueId === component.id}
                    onClick={() => handleIssueChange(component.id)}
                  >
                    <ListItemText
                      primary={component.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: selectedIssueId === component.id ? 'bold' : 'normal'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            {selectedIssueId ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Scenario Spectrum
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click on a scenario to view its risk assessment
                  </Typography>
                  
                  <ScenarioSpectrum
                    scenarios={scenarios}
                    party1Name={party1Name}
                    party2Name={party2Name}
                    onSelectScenario={handleSelectScenario}
                    selectedScenarioId={selectedScenario?.id}
                  />
                </Box>
                
                {showRiskAssessment && selectedScenario && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Risk Assessment
                    </Typography>
                    <RiskAssessmentTable
                      assessments={currentCase.riskAssessments}
                      scenarioId={selectedScenario.id}
                      viewMode="edit"
                      onAddAssessment={handleAddAssessment}
                      onUpdateAssessment={handleUpdateRiskAssessment}
                      onDeleteAssessment={handleDeleteAssessment}
                    />
                  </Box>
                )}
              </>
            ) : (
              <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="body1" color="text.secondary">
                  Select an issue from the list to view its scenarios
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {loading && <LoadingOverlay open={loading} message="Generating scenarios..." />}
    </Container>
  );
};

export default NegotiationScenario; 