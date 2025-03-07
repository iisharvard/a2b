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
  CircularProgress,
  Divider,
} from '@mui/material';
import { RootState } from '../store';
import {
  setAnalysis,
  updateIoA,
  updateIceberg,
  updateComponents,
  Analysis,
  Component,
} from '../store/negotiationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import MarkdownEditor from '../components/MarkdownEditor';

const ReviewAndRevise = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentCase, loading: stateLoading } = useSelector(
    (state: RootState) => state.negotiation
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ioa, setIoa] = useState('');
  const [iceberg, setIceberg] = useState('');
  const [componentsMarkdown, setComponentsMarkdown] = useState('');

  useEffect(() => {
    if (!currentCase) {
      navigate('/');
      return;
    }

    const fetchAnalysis = async () => {
      if (currentCase.analysis) {
        // If we already have an analysis, use it
        setIoa(currentCase.analysis.ioa);
        setIceberg(currentCase.analysis.iceberg);
        
        // Convert components to markdown for editing - only show component names and descriptions
        const componentsText = currentCase.analysis.components
          .map(
            (comp) =>
              `## ${comp.name}\n${comp.description}`
          )
          .join('\n\n');
        
        setComponentsMarkdown(componentsText);
      } else {
        // Otherwise, generate a new analysis
        setLoading(true);
        setError(null);
        
        try {
          const analysisResult = await api.analyzeCase(
            currentCase.content,
            currentCase.party1,
            currentCase.party2
          );
          
          // Check if we hit a rate limit
          if ('rateLimited' in analysisResult && analysisResult.rateLimited) {
            // Keep loading state true to show loading screen
            console.log('Rate limit hit, keeping loading screen visible');
            return; // Exit without setting loading to false
          }
          
          // Now we know it's a valid Analysis object
          const analysis = analysisResult as Analysis;
          dispatch(setAnalysis(analysis));
          
          setIoa(analysis.ioa);
          setIceberg(analysis.iceberg);
          
          // Convert components to markdown for editing - only show component names and descriptions
          const componentsText = analysis.components
            .map(
              (comp: Component) =>
                `## ${comp.name}\n${comp.description}`
            )
            .join('\n\n');
          
          setComponentsMarkdown(componentsText);
        } catch (err) {
          console.error(err);
          setError('Failed to analyze case. Please try again.');
        } finally {
          // Only set loading to false if we didn't hit a rate limit
          setLoading(false);
        }
      }
    };

    fetchAnalysis();
  }, [currentCase, dispatch, navigate]);

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

  if (!currentCase) {
    return null; // Will redirect in useEffect
  }

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Analysis & Issues
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
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
      
      {loading && <LoadingOverlay open={loading} message="Processing analysis..." />}
    </Container>
  );
};

export default ReviewAndRevise; 