import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Divider,
} from '@mui/material';
import { RootState } from '../store';
import {
  setCase,
  setParties,
  clearState,
  Party,
} from '../store/negotiationSlice';
import { api } from '../services/api';
import MarkdownEditor from '../components/MarkdownEditor';

/**
 * InitialSetup component for entering case details and party information
 */
const InitialSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  
  // Form state
  const [caseContent, setCaseContent] = useState('');
  const [party1Name, setParty1Name] = useState('');
  const [party2Name, setParty2Name] = useState('');
  const [party1Description, setParty1Description] = useState('');
  const [party2Description, setParty2Description] = useState('');
  const [suggestedParties, setSuggestedPartiesState] = useState<Array<{name: string; description: string; isPrimary: boolean}>>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [partiesIdentified, setPartiesIdentified] = useState(false);
  
  // Load case content from Redux if available
  useEffect(() => {
    if (currentCase) {
      setCaseContent(currentCase.content || '');
      
      if (currentCase.suggestedParties && currentCase.suggestedParties.length >= 2) {
        const p1 = currentCase.suggestedParties[0];
        const p2 = currentCase.suggestedParties[1];
        
        setParty1Name(p1.name || '');
        setParty2Name(p2.name || '');
        setParty1Description(p1.description || '');
        setParty2Description(p2.description || '');
        setSuggestedPartiesState(currentCase.suggestedParties.map(party => ({
          name: party.name,
          description: party.description,
          isPrimary: party.isPrimary
        })));
        setPartiesIdentified(true);
      }
    }
  }, [currentCase]);
  
  /**
   * Identifies parties in the case content
   */
  const identifyParties = useCallback(async () => {
    if (!caseContent.trim()) {
      setError('Please enter case content before identifying parties.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.identifyParties(caseContent);
      
      if ('rateLimited' in result) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }
      
      if (result && result.length >= 2) {
        setSuggestedPartiesState(result);
        setParty1Name(result[0].name || '');
        setParty2Name(result[1].name || '');
        setParty1Description(result[0].description || '');
        setParty2Description(result[1].description || '');
        setPartiesIdentified(true);
      } else {
        setError('Could not identify parties in the case. Please enter them manually.');
      }
    } catch (err) {
      console.error('Error identifying parties:', err);
      setError('Failed to identify parties. Please try again or enter them manually.');
    } finally {
      setLoading(false);
    }
  }, [caseContent]);
  
  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(() => {
    if (!caseContent.trim()) {
      setError('Please enter case content.');
      return;
    }
    
    if (!party1Name.trim() || !party2Name.trim()) {
      setError('Please enter names for both parties.');
      return;
    }
    
    // Update parties with user input
    const updatedParties = [
      {
        name: party1Name,
        description: party1Description,
        isPrimary: true
      },
      {
        name: party2Name,
        description: party2Description,
        isPrimary: true
      },
    ];
    
    // Save to Redux
    dispatch(setCase({ 
      id: Date.now().toString(), 
      content: caseContent 
    }));
    dispatch(setParties(updatedParties));
    
    // Navigate to analysis page
    navigate('/analysis');
  }, [
    caseContent,
    party1Name,
    party2Name,
    party1Description,
    party2Description,
    dispatch,
    navigate,
  ]);
  
  /**
   * Clears all data
   */
  const handleClearData = useCallback(() => {
    // Clear Redux state
    dispatch(clearState());
    
    // Clear component state
    setCaseContent('');
    setParty1Name('');
    setParty2Name('');
    setParty1Description('');
    setParty2Description('');
    setSuggestedPartiesState([]);
    setPartiesIdentified(false);
    setError(null);
    
    // Close dialog
    setConfirmDialogOpen(false);
  }, [dispatch]);
  
  /**
   * Dialog control functions
   */
  const openConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);
  
  const closeConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);
  
  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Case Setup
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
              Case Content
            </Typography>
            <MarkdownEditor
              value={caseContent}
              onChange={setCaseContent}
              label="Enter or paste your case content here"
              height="400px"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Party Information
              </Typography>
              <Button
                variant="outlined"
                onClick={identifyParties}
                disabled={loading || !caseContent.trim()}
              >
                {loading ? 'Identifying...' : 'Identify Parties'}
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Party 1 Name"
                  value={party1Name}
                  onChange={(e) => setParty1Name(e.target.value)}
                  margin="normal"
                  variant="outlined"
                  required
                />
                <TextField
                  fullWidth
                  label="Party 1 Description"
                  value={party1Description}
                  onChange={(e) => setParty1Description(e.target.value)}
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Party 2 Name"
                  value={party2Name}
                  onChange={(e) => setParty2Name(e.target.value)}
                  margin="normal"
                  variant="outlined"
                  required
                />
                <TextField
                  fullWidth
                  label="Party 2 Description"
                  value={party2Description}
                  onChange={(e) => setParty2Description(e.target.value)}
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={openConfirmDialog}
            >
              Clear All Data
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!caseContent.trim() || !party1Name.trim() || !party2Name.trim()}
            >
              Continue to Analysis
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={closeConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Clear All Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will clear all case content, party information, and analysis data.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleClearData} color="error" autoFocus>
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InitialSetup; 