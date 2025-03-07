import { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import { RootState } from '../store';
import { 
  addRiskAssessment, 
  updateRiskAssessment,
  setRiskAssessments,
  setRiskAssessmentsRecalculated
} from '../store/negotiationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import RiskAssessmentTable from '../components/RiskAssessmentTable';
import RecalculationWarning from '../components/RecalculationWarning';

const RiskAssessment = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentCase, selectedScenario } = useSelector(
    (state: RootState) => state.negotiation
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingInitial, setGeneratingInitial] = useState(false);
  
  // Check if scenarios have been recalculated but risk assessments haven't been updated
  const needsRecalculation = currentCase?.recalculationStatus && 
    !currentCase.recalculationStatus.riskAssessmentsRecalculated && 
    currentCase.recalculationStatus.scenariosRecalculated;
  
  useEffect(() => {
    if (!currentCase || !selectedScenario) {
      navigate('/scenarios');
      return;
    }

    const generateInitialAssessment = async () => {
      // Check if we already have risk assessments for this scenario
      const existingAssessments = currentCase.riskAssessments.filter(
        (ra) => ra.scenarioId === selectedScenario.id
      );
      
      if (existingAssessments.length === 0 && !generatingInitial) {
        setGeneratingInitial(true);
        setLoading(true);
        
        try {
          const assessment = await api.generateRiskAssessment(selectedScenario.id);
          dispatch(addRiskAssessment(assessment));
        } catch (err) {
          console.error(err);
          setError('Failed to generate initial risk assessment. You can still add assessments manually.');
        } finally {
          setLoading(false);
        }
      }
    };

    generateInitialAssessment();
  }, [currentCase, selectedScenario, dispatch, navigate, generatingInitial]);

  const handleAddAssessment = (assessment: any) => {
    dispatch(addRiskAssessment(assessment));
  };

  const handleUpdateRiskAssessment = (assessment: any) => {
    dispatch(updateRiskAssessment(assessment));
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    if (!currentCase) return;
    
    const updatedAssessments = currentCase.riskAssessments.filter(
      (ra) => ra.id !== assessmentId
    );
    
    dispatch(setRiskAssessments(updatedAssessments));
  };

  const handleBack = () => {
    navigate('/scenarios');
  };

  const handleFinish = () => {
    // In a real app, you might save the entire case to a database here
    navigate('/');
  };

  const handleGenerateRiskAssessment = async () => {
    if (!selectedScenario) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const assessment = await api.generateRiskAssessment(selectedScenario.id);
      dispatch(addRiskAssessment(assessment));
    } catch (err) {
      console.error(err);
      setError('Failed to generate risk assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle recalculation of risk assessments
  const handleRecalculateRiskAssessments = async () => {
    if (!currentCase || !selectedScenario) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get existing risk assessment for this scenario
      const existingAssessment = currentCase.riskAssessments.find(
        (ra) => ra.scenarioId === selectedScenario.id
      );
      
      if (existingAssessment) {
        // Generate new risk assessment
        const assessment = await api.generateRiskAssessment(selectedScenario.id);
        
        // Update the existing assessment
        dispatch(updateRiskAssessment({
          ...assessment,
          id: existingAssessment.id
        }));
      } else {
        // Generate new risk assessment
        const assessment = await api.generateRiskAssessment(selectedScenario.id);
        
        // Add to Redux
        dispatch(addRiskAssessment(assessment));
      }
      
      // Mark risk assessments as recalculated
      dispatch(setRiskAssessmentsRecalculated(true));
      
      // Show success message
      setError('Risk assessment has been successfully recalculated based on the updated scenarios.');
    } catch (err) {
      console.error('Error recalculating risk assessment:', err);
      setError('Failed to recalculate risk assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentCase || !selectedScenario) {
    return null; // Will redirect in useEffect
  }

  const selectedComponent = currentCase.analysis?.components.find(
    (c) => c.id === selectedScenario.componentId
  );

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Risk Assessment
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Show recalculation warning if scenarios have been recalculated */}
        {needsRecalculation && (
          <RecalculationWarning 
            message="The negotiation scenarios have been updated. The risk assessment may not reflect the latest changes."
            onRecalculate={handleRecalculateRiskAssessments}
          />
        )}
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Selected Scenario
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="body1" paragraph>
                {selectedScenario?.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Negotiation Issue: {currentCase?.analysis?.components.find(c => c.id === selectedScenario?.componentId)?.name}
              </Typography>
            </Paper>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Negotiation Issue Details
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {selectedComponent && (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Description:</strong> {selectedComponent.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{currentCase?.party1.name} Redline:</strong> {selectedComponent.redlineParty1}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{currentCase?.party1.name} Bottomline:</strong> {selectedComponent.bottomlineParty1}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{currentCase?.party2.name} Redline:</strong> {selectedComponent.redlineParty2}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{currentCase?.party2.name} Bottomline:</strong> {selectedComponent.bottomlineParty2}
                    </Typography>
                  </>
                )}
              </Paper>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Risk Assessment
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleGenerateRiskAssessment}
                disabled={loading || !selectedScenario}
              >
                Regenerate Assessment
              </Button>
            </Box>
            
            {currentCase.riskAssessments.filter(ra => ra.scenarioId === selectedScenario?.id).length > 0 ? (
              <RiskAssessmentTable
                riskAssessment={currentCase.riskAssessments.filter(ra => ra.scenarioId === selectedScenario?.id)}
                scenarioId={selectedScenario?.id || ''}
                onAddAssessment={(assessment) => dispatch(addRiskAssessment(assessment))}
                onUpdateAssessment={handleUpdateRiskAssessment}
                onDeleteAssessment={(id) => {}}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  {loading ? 'Generating risk assessment...' : 'No risk assessment generated yet.'}
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {loading && <LoadingOverlay open={loading} message="Generating risk assessment..." />}
    </Container>
  );
};

export default RiskAssessment; 