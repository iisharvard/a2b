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
import MarkdownEditor from '../components/MarkdownEditor';
import { parseComponentsFromMarkdown, componentsToMarkdown } from '../utils/componentParser';

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

// Simplified progress state
interface AnalysisProgressState {
  message: string;
  progress: number; // 0-100
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
    message: '',
    progress: 0
  });
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimeoutRef = useRef<number | null>(null);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
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
      onProgress?: (message: string, progress: number) => void
    ): Promise<ApiResponse<AnalysisResponse>> => {
      // Set initial progress
      onProgress?.('Analyzing Island of Agreements...', 10);
      
      // Call API
      const result = await api.analyzeCase(content, p1, p2);
      
      // If we got a result (not rate limited), simulate intermediate and completion steps
      if (!('rateLimited' in result)) {
        onProgress?.('Performing Iceberg Analysis...', 50);
        // Small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));
        onProgress?.('Identifying Components and Boundaries...', 90);
        await new Promise(resolve => setTimeout(resolve, 300));
        onProgress?.('Analysis complete', 100);
      }
      
      return result;
    },
    []
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
      
      // Reset progress state
      setAnalysisProgress({ message: 'Starting analysis...', progress: 0 });
      
      const analysisResult = await analyzeWithProgress(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1],
        (message, progress) => {
          console.log(`Progress update: ${message}, ${progress}%`);
          setAnalysisProgress({ message, progress });
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
            <MarkdownEditor
              value={value}
              onChange={onChange}
              label=""
              height="700px"
              placeholder={placeholder}
              disabled={loading}
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Grid>
  ), [loading]);

  // If no case is available, don't render anything
  if (!currentCase) {
    return null;
  }

  // Simple progress bar component
  const ProgressBar = ({ progress }: { progress: number }) => (
    <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
      <Box 
        sx={{ 
          height: '100%', 
          width: `${progress}%`, 
          bgcolor: 'primary.main',
          transition: 'width 0.5s ease-in-out'
        }} 
      />
    </Box>
  );

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
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              {analysisProgress.message}
            </Typography>
          )}
          <Box sx={{ ml: 'auto' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAnalyze}
              disabled={loading || retryCountdown > 0}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ 
                fontSize: '0.9rem',
                minWidth: '160px'
              }}
            >
              {loading ? 'Analyzing...' : retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Reevaluate Analysis'}
            </Button>
          </Box>
        </Box>
        
        {loading && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <ProgressBar progress={analysisProgress.progress} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {analysisProgress.progress}%
              </Typography>
            </Box>
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
    </Container>
  );
};

export default ReviewAndRevise; 