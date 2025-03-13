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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
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
import LoadingOverlay from '../components/LoadingOverlay';
import MarkdownEditor from '../components/MarkdownEditor';
import { parseComponentsFromMarkdown, componentsToMarkdown } from '../utils/componentParser';
import TypewriterText from '../components/TypewriterText';

// Types
type ApiResponse<T> = T | { rateLimited: true };

interface AnalysisResponse extends Analysis {
  id: string;
  ioa: string;
  iceberg: string;
  components: Component[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisProgressState {
  step: number;
  message: string;
  substep: number;
}

/**
 * ReviewAndRevise component handles the analysis of case content
 * and allows users to review and revise the analysis results.
 */
const ReviewAndRevise = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const analysisInProgress = useRef(false);
  
  // Redux state
  const { currentCase } = useSelector(
    (state: RootState) => state.negotiation
  );
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ioa, setIoa] = useState('');
  const [iceberg, setIceberg] = useState('');
  const [componentsMarkdown, setComponentsMarkdown] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressState>({
    step: 0,
    message: '',
    substep: 0
  });
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState<{
    ioa: string;
    iceberg: string;
  }>({ ioa: '', iceberg: '' });
  const analyzerRef = useRef<AsyncGenerator<any> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  /**
   * Wrapper for the API analyzeCase function that handles progress updates
   */
  const analyzeWithProgress = useCallback(
    async (
      content: string,
      p1: Party,
      p2: Party,
      onProgress?: (step: number, message: string, substep: number) => void
    ): Promise<ApiResponse<AnalysisResponse>> => {
      // If streaming is not enabled, use the original implementation
      if (!streaming) {
        return api.analyzeCase(content, p1, p2, onProgress);
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      try {
        // Get the generator
        analyzerRef.current = api.analyzeCaseStreaming(content, p1, p2, onProgress);
        
        // Process the stream
        let lastResult: any = null;
        
        while (!abortControllerRef.current.signal.aborted) {
          const result = await analyzerRef.current.next();
          
          if (result.done) {
            return result.value;
          }
          
          // Store the partial result
          lastResult = result.value;
          
          // Update the streamed text
          if ('ioa' in result.value) {
            setStreamedText(prev => ({
              ...prev,
              ioa: result.value.ioa || prev.ioa
            }));
          }
          
          if ('iceberg' in result.value) {
            setStreamedText(prev => ({
              ...prev,
              iceberg: result.value.iceberg || prev.iceberg
            }));
          }
        }
        
        // If aborted, return the last result or a rate limited response
        return lastResult || { rateLimited: true };
      } catch (error) {
        console.error('Error in streaming analysis:', error);
        if (error instanceof Error && error.message.includes('rate limit')) {
          return { rateLimited: true };
        }
        throw error;
      }
    },
    [streaming]
  );

  /**
   * Validates that the parties are properly set up
   */
  const validateParties = useCallback(() => {
    if (!currentCase?.suggestedParties || 
        !Array.isArray(currentCase.suggestedParties) || 
        currentCase.suggestedParties.length < 2) {
      return false;
    }
    
    const party1 = currentCase.suggestedParties[0];
    const party2 = currentCase.suggestedParties[1];
    
    return !!(party1?.name && party2?.name);
  }, [currentCase]);

  /**
   * Fetches analysis data from the API or uses existing analysis
   */
  const fetchAnalysis = useCallback(async () => {
    if (!currentCase || analysisInProgress.current) return;
    
    // If we already have an analysis, use it without re-analyzing
    if (currentCase.analysis) {
      setIoa(currentCase.analysis.ioa);
      setIceberg(currentCase.analysis.iceberg);
      
      const componentsText = componentsToMarkdown(currentCase.analysis.components);
      setComponentsMarkdown(componentsText);
      return;
    }

    // Validate parties before analysis
    if (!validateParties()) {
      setError('Please set up both parties with names before proceeding with analysis.');
      return;
    }

    // Only analyze if we don't have an analysis yet
    analysisInProgress.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1]
      );
      
      // Check if we hit a rate limit
      if ('rateLimited' in analysisResult) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }
      
      dispatch(setAnalysis(analysisResult));
      setIoa(analysisResult.ioa);
      setIceberg(analysisResult.iceberg);
      
      const componentsText = componentsToMarkdown(analysisResult.components);
      setComponentsMarkdown(componentsText);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to analyze case. Please try again.');
    } finally {
      setLoading(false);
      analysisInProgress.current = false;
    }
  }, [currentCase, dispatch, analyzeWithProgress, validateParties]);

  // Load analysis when component mounts
  useEffect(() => {
    if (!currentCase) {
      navigate('/');
      return;
    }

    if (!validateParties()) {
      setError('Please set up both parties with names before proceeding with analysis.');
      navigate('/');
      return;
    }

    fetchAnalysis();
  }, [currentCase, fetchAnalysis, navigate, validateParties]);

  /**
   * Handlers for updating analysis content
   */
  const handleIoaChange = useCallback((value: string) => {
    setIoa(value);
    dispatch(updateIoA(value));
  }, [dispatch]);

  const handleIcebergChange = useCallback((value: string) => {
    setIceberg(value);
    dispatch(updateIceberg(value));
  }, [dispatch]);

  const handleComponentsChange = useCallback((value: string) => {
    setComponentsMarkdown(value);
    
    const parsedComponents = parseComponentsFromMarkdown(
      value,
      currentCase?.analysis?.components || []
    );
    
    dispatch(updateComponents(parsedComponents));
  }, [currentCase, dispatch]);

  /**
   * Navigate to the next page
   */
  const handleNext = useCallback(() => {
    dispatch(updateIoA(ioa));
    dispatch(updateIceberg(iceberg));
    navigate('/boundaries');
  }, [dispatch, ioa, iceberg, navigate]);

  /**
   * Start a retry countdown timer
   */
  const startRetryCountdown = useCallback((seconds: number) => {
    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }
    
    setRetryCountdown(seconds);
    
    const countDown = () => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          // When countdown reaches 0, retry the analysis
          handleAnalyze();
          return 0;
        }
        
        // Continue countdown
        retryTimeoutRef.current = window.setTimeout(countDown, 1000);
        return prev - 1;
      });
    };
    
    // Start the countdown
    retryTimeoutRef.current = window.setTimeout(countDown, 1000);
  }, []);
  
  /**
   * Cancel the retry countdown
   */
  const cancelRetryCountdown = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setRetryCountdown(0);
  }, []);

  /**
   * Stops the streaming process
   */
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setStreaming(false);
    
    // Use the current streamed text as the final result
    if (streamedText.ioa) {
      setIoa(streamedText.ioa);
      dispatch(updateIoA(streamedText.ioa));
    }
    
    if (streamedText.iceberg) {
      setIceberg(streamedText.iceberg);
      dispatch(updateIceberg(streamedText.iceberg));
    }
  }, [dispatch, streamedText]);

  /**
   * Recalculate the analysis
   */
  const handleAnalyze = useCallback(async () => {
    // Cancel any existing retry countdown
    cancelRetryCountdown();
    
    if (!currentCase || analysisInProgress.current) return;
    
    if (!validateParties()) {
      setError('Please set up both parties with names before proceeding with analysis.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      analysisInProgress.current = true;
      
      // Enable streaming for this analysis
      setStreaming(true);
      setStreamedText({ ioa: '', iceberg: '' });

      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1],
        (step, message, substep) => {
          setAnalysisProgress({ step, message, substep });
        }
      );

      if ('rateLimited' in analysisResult) {
        setError('Rate limit reached. The system will automatically retry in 60 seconds.');
        startRetryCountdown(60);
        return;
      }

      dispatch(setAnalysis(analysisResult));
      dispatch(setAnalysisRecalculated(true));
      
      setIoa(analysisResult.ioa);
      setIceberg(analysisResult.iceberg);
      
      const componentsText = componentsToMarkdown(analysisResult.components);
      setComponentsMarkdown(componentsText);
      
      setError('Analysis completed successfully.');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze case. Please try again.');
    } finally {
      setLoading(false);
      analysisInProgress.current = false;
      setStreaming(false);
    }
  }, [currentCase, analyzeWithProgress, validateParties, dispatch, startRetryCountdown, cancelRetryCountdown]);

  /**
   * Render the analysis section
   */
  const renderAnalysisSection = useCallback((
    title: string,
    id: string,
    value: string,
    onChange: (value: string) => void,
    defaultExpanded = false,
    placeholder = ''
  ) => (
    <Grid item xs={12}>
      <Accordion defaultExpanded={defaultExpanded}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`${id}-content`}
          id={`${id}-header`}
          tabIndex={0}
        >
          <Typography variant="h6">{title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box role="region" aria-labelledby={`${id}-header`}>
            {streaming && id === 'ioa' && streamedText.ioa ? (
              <Box mb={2}>
                <TypewriterText 
                  text={streamedText.ioa} 
                  speed={20}
                  variant="body1"
                />
              </Box>
            ) : streaming && id === 'iceberg' && streamedText.iceberg ? (
              <Box mb={2}>
                <TypewriterText 
                  text={streamedText.iceberg} 
                  speed={20}
                  variant="body1"
                />
              </Box>
            ) : (
              <MarkdownEditor
                value={value}
                onChange={onChange}
                label=""
                height="700px"
                placeholder={placeholder}
              />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Grid>
  ), [streaming, streamedText]);

  // If no case is available, don't render anything
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
            {retryCountdown > 0 && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Retrying in {retryCountdown} seconds...
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="inherit" 
                  onClick={cancelRetryCountdown}
                  sx={{ ml: 2 }}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Alert>
        )}
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            {streaming && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleStopStreaming}
                sx={{ fontSize: '0.8rem' }}
                size="small"
              >
                Stop Streaming
              </Button>
            )}
          </Box>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAnalyze}
            disabled={loading || retryCountdown > 0 || streaming}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{ fontSize: '0.8rem' }}
            size="small"
          >
            {loading ? 'Analyzing...' : retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Reevaluate Analysis'}
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
          {renderAnalysisSection(
            'Issues of Agreement (IoA)',
            'ioa',
            ioa,
            handleIoaChange,
            true
          )}
          
          {renderAnalysisSection(
            'Iceberg Analysis',
            'iceberg',
            iceberg,
            handleIcebergChange
          )}
          
          {renderAnalysisSection(
            'Issues to Negotiate',
            'issues',
            componentsMarkdown,
            handleComponentsChange,
            false,
            "## Component Name\n\nComponent description and details..."
          )}
          
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