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
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
} from '@mui/material';
import { RootState } from '../store';
import {
  setAnalysis,
  updateIoA,
  updateIceberg,
  updateComponents,
  Analysis,
  Component,
  Party,
} from '../store/negotiationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import MarkdownEditor from '../components/MarkdownEditor';

const ReviewAndRevise = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const analysisInProgress = useRef(false);
  
  const { currentCase, loading: stateLoading } = useSelector(
    (state: RootState) => state.negotiation
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ioa, setIoa] = useState('');
  const [iceberg, setIceberg] = useState('');
  const [componentsMarkdown, setComponentsMarkdown] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState({
    step: 0,
    message: '',
    substep: 0
  });
  
  // Memoize the analysis function to prevent recreating it on every render
  const analyzeWithProgress = useCallback(async (content: string, p1: Party, p2: Party) => {
    return api.analyzeCase(
      content,
      p1,
      p2,
      (step: number, message: string, substep: number) => {
        setAnalysisProgress({ step, message, substep });
      }
    );
  }, []);

  // Memoize the fetch analysis function
  const fetchAnalysis = useCallback(async () => {
    if (!currentCase || analysisInProgress.current) return;
    
    // If we already have an analysis, use it without re-analyzing
    if (currentCase.analysis) {
      setIoa(currentCase.analysis.ioa);
      setIceberg(currentCase.analysis.iceberg);
      
      const componentsText = currentCase.analysis.components
        .map((comp) => `## ${comp.name}\n${comp.description}`)
        .join('\n\n');
      
      setComponentsMarkdown(componentsText);
      return;
    }

    // Only analyze if we don't have an analysis yet
    analysisInProgress.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.party1,
        currentCase.party2
      );
      
      // Check if we hit a rate limit
      if ('rateLimited' in analysisResult && analysisResult.rateLimited) {
        console.log('Rate limit hit, keeping loading screen visible');
        return;
      }
      
      // Now we know it's a valid Analysis object
      const analysis = analysisResult as Analysis;
      dispatch(setAnalysis(analysis));
      
      setIoa(analysis.ioa);
      setIceberg(analysis.iceberg);
      
      const componentsText = analysis.components
        .map((comp: Component) => `## ${comp.name}\n${comp.description}`)
        .join('\n\n');
      
      setComponentsMarkdown(componentsText);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze case. Please try again.');
    } finally {
      setLoading(false);
      analysisInProgress.current = false;
    }
  }, [currentCase, dispatch, analyzeWithProgress]);

  // Effect to handle initial load and navigation
  useEffect(() => {
    if (!currentCase) {
      navigate('/');
      return;
    }

    fetchAnalysis();
  }, [currentCase?.id, fetchAnalysis]); // Add fetchAnalysis to dependencies

  const handleIoaChange = (value: string) => {
    setIoa(value);
    dispatch(updateIoA(value));
  };

  const handleIcebergChange = (value: string) => {
    setIceberg(value);
    dispatch(updateIceberg(value));
  };

  const handleComponentsChange = (value: string) => {
    setComponentsMarkdown(value);
    
    // This is a simplified parser for demonstration
    // In a real app, you'd want more robust parsing
    try {
      const sections = value.split('##').filter(Boolean);
      const components = sections.map((section) => {
        const lines = section.trim().split('\n');
        const name = lines[0].trim();
        
        const descriptionLines = [];
        let i = 1;
        while (i < lines.length && !lines[i].startsWith('###')) {
          descriptionLines.push(lines[i]);
          i++;
        }
        const description = descriptionLines.join('\n').trim();
        
        // Preserve existing RLBL values if they exist, otherwise use empty strings
        const existingComponent = currentCase?.analysis?.components.find((c) => c.name === name);
        
        return {
          id: existingComponent?.id || Date.now().toString(),
          name,
          description,
          redlineParty1: existingComponent?.redlineParty1 || '',
          bottomlineParty1: existingComponent?.bottomlineParty1 || '',
          redlineParty2: existingComponent?.redlineParty2 || '',
          bottomlineParty2: existingComponent?.bottomlineParty2 || '',
          priority: existingComponent?.priority || 1,
        };
      });
      
      dispatch(updateComponents(components));
    } catch (err) {
      console.error('Error parsing components:', err);
      // We don't set an error state here to avoid disrupting the user
      // The components will be validated before proceeding
    }
  };

  const handleNext = () => {
    // Save the current state to Redux
    dispatch(updateIoA(ioa));
    dispatch(updateIceberg(iceberg));
    
    // The components are already being updated in handleComponentsChange
    // No need to parse them again here
    
    // Navigate to the next tab
    navigate('/boundaries');
  };

  // Add recalculate function with progress tracking
  const handleRecalculate = async () => {
    if (!currentCase) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.party1,
        currentCase.party2
      );
      
      // Check if we hit a rate limit
      if ('rateLimited' in analysisResult && analysisResult.rateLimited) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }
      
      // Now we know it's a valid Analysis object
      const analysis = analysisResult as Analysis;
      dispatch(setAnalysis(analysis));
      
      setIoa(analysis.ioa);
      setIceberg(analysis.iceberg);
      
      const componentsText = analysis.components
        .map((comp: Component) => `## ${comp.name}\n${comp.description}`)
        .join('\n\n');
      
      setComponentsMarkdown(componentsText);
      setError('Analysis has been successfully recalculated.');
      
    } catch (err) {
      console.error(err);
      setError('Failed to recalculate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentCase) {
    return null; // Will redirect in useEffect
  }

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Analysis and Issues
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Replace recalculation warning with a simple button */}
        {currentCase?.recalculationStatus && !currentCase.recalculationStatus.analysisRecalculated && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRecalculate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ fontSize: '0.8rem' }}
              size="small"
            >
              Recalculate Analysis
            </Button>
          </Box>
        )}
        
        {loading && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {analysisProgress.message}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={analysisProgress.substep} 
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    backgroundColor: '#1a90ff',
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" align="right">
                Step {analysisProgress.step} of 3
              </Typography>
            </Stack>
          </Box>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Issues of Agreement (IoA)
            </Typography>
            <MarkdownEditor
              value={ioa}
              onChange={handleIoaChange}
              label=""
              height="200px"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Iceberg Analysis
            </Typography>
            <MarkdownEditor
              value={iceberg}
              onChange={handleIcebergChange}
              label=""
              height="200px"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Issues to Negotiate
            </Typography>
            <MarkdownEditor
              value={componentsMarkdown}
              onChange={handleComponentsChange}
              height="300px"
            />
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={loading || !ioa || !iceberg || !componentsMarkdown}
              size="large"
            >
              Continue to Boundaries
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading && <LoadingOverlay open={loading} message={analysisProgress.message} />}
    </Container>
  );
};

export default ReviewAndRevise; 