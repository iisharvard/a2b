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
import { setAnalysisRecalculated } from '../store/recalculationSlice';
import { api } from '../services/api';
import { ApiResponse, AnalysisResponse } from '../types/api';
import LoadingOverlay from '../components/LoadingOverlay';
import MarkdownEditor from '../components/MarkdownEditor';
import { parseComponentsFromMarkdown, componentsToMarkdown } from '../utils/componentParser';

const ReviewAndRevise = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const analysisInProgress = useRef(false);
  
  const { currentCase, loading: stateLoading } = useSelector(
    (state: RootState) => state.negotiation
  );
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);
  
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
  
  const analyzeWithProgress = useCallback(
    async (
      content: string,
      p1: Party,
      p2: Party,
      onProgress?: (step: number, message: string, substep: number) => void
    ): Promise<ApiResponse<AnalysisResponse>> => {
      return api.analyzeCase(content, p1, p2, onProgress);
    },
    []
  );

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
      if (!currentCase.suggestedParties || currentCase.suggestedParties.length < 2) {
        throw new Error('Please set up party information before proceeding with analysis.');
      }

      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1]
      );
      
      // Check if we hit a rate limit
      if ('rateLimited' in analysisResult) {
        console.log('Rate limit hit, keeping loading screen visible');
        return;
      }
      
      dispatch(setAnalysis(analysisResult));
      setIoa(analysisResult.ioa);
      setIceberg(analysisResult.iceberg);
      
      const componentsText = analysisResult.components
        .map((comp) => `## ${comp.name}\n${comp.description}`)
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

  useEffect(() => {
    if (!currentCase) {
      navigate('/');
      return;
    }

    // Check if parties are set up
    if (!currentCase.suggestedParties || currentCase.suggestedParties.length < 2) {
      setError('Please set up party information before proceeding with analysis.');
      navigate('/parties');
      return;
    }

    fetchAnalysis();
  }, [currentCase?.id, fetchAnalysis, navigate]);

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
    
    const parsedComponents = parseComponentsFromMarkdown(
      value,
      currentCase?.analysis?.components || []
    );
    
    dispatch(updateComponents(parsedComponents));
  };

  const handleNext = () => {
    dispatch(updateIoA(ioa));
    dispatch(updateIceberg(iceberg));
    
    navigate('/boundaries');
  };

  const handleRecalculate = async () => {
    if (!currentCase || !currentCase.suggestedParties.length) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1]
      );
      
      if ('rateLimited' in analysisResult) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }
      
      dispatch(setAnalysis(analysisResult));
      setIoa(analysisResult.ioa);
      setIceberg(analysisResult.iceberg);
      
      const componentsText = analysisResult.components
        .map((comp) => `## ${comp.name}\n${comp.description}`)
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

  const handleAnalyze = async () => {
    if (!currentCase || analysisInProgress.current || !currentCase.suggestedParties.length) return;
    
    try {
      setLoading(true);
      setError(null);
      analysisInProgress.current = true;

      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1],
        (step, message, substep) => {
          setAnalysisProgress({ step, message, substep });
        }
      );

      if ('rateLimited' in analysisResult) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }

      dispatch(setAnalysis(analysisResult));
      dispatch(setAnalysisRecalculated(true));
      setError('Analysis completed successfully.');
    } catch (err) {
      setError('Failed to analyze case. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
      analysisInProgress.current = false;
    }
  };

  if (!currentCase) {
    return null;
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
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAnalyze}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{ fontSize: '0.8rem' }}
            size="small"
          >
            Reevaluate
          </Button>
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
              placeholder="## Component Name

Component description and details..."
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