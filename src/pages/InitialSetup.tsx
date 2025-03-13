import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Divider,
  CircularProgress,
  SelectChangeEvent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { setCase, setParties, clearState, setCaseProcessed } from '../store/negotiationSlice';
import LoadingOverlay from '../components/LoadingOverlay';
import { api } from '../services/api.ts';

interface PartyOption {
  name: string;
  description: string;
  isPrimary: boolean;
}

// Constants for localStorage keys
const STORAGE_KEY_CASE_CONTENT = 'a2b_case_content';
const STORAGE_KEY_PARTY1_NAME = 'a2b_party1_name';
const STORAGE_KEY_PARTY2_NAME = 'a2b_party2_name';

const InitialSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get current case from Redux
  const { currentCase } = useSelector((state: any) => state.negotiation);
  
  // Initialize state with values from localStorage if available
  const [caseContent, setCaseContentLocal] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_CASE_CONTENT) || '';
  });
  
  const [party1Name, setParty1Name] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_PARTY1_NAME) || '';
  });
  
  const [party2Name, setParty2Name] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_PARTY2_NAME) || '';
  });
  
  const [party1Description, setParty1Description] = useState('');
  const [party2Description, setParty2Description] = useState('');
  const [suggestedParties, setSuggestedParties] = useState<PartyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [partyIdentificationLoading, setPartyIdentificationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // Check if case content has been processed and load suggested parties from Redux
  useEffect(() => {
    if (currentCase && currentCase.processed && currentCase.suggestedParties.length > 0) {
      setSuggestedParties(currentCase.suggestedParties);
      
      // If parties were found, pre-select the first two
      if (currentCase.suggestedParties.length >= 2) {
        setParty1Name(currentCase.suggestedParties[0].name);
        setParty1Description(currentCase.suggestedParties[0].description);
        setParty2Name(currentCase.suggestedParties[1].name);
        setParty2Description(currentCase.suggestedParties[1].description);
      }
    }
  }, [currentCase]);

  // Save values to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CASE_CONTENT, caseContent);
  }, [caseContent]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PARTY1_NAME, party1Name);
  }, [party1Name]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PARTY2_NAME, party2Name);
  }, [party2Name]);

  // Function to identify parties from case content
  const identifyPartiesFromContent = async () => {
    if (!caseContent.trim()) {
      setError('Please enter case content first');
      return;
    }
    
    setPartyIdentificationLoading(true);
    setError(null);
    
    try {
      const parties = await api.identifyParties(caseContent);
      setSuggestedParties(parties);
      
      // Save the processed flag and suggested parties to Redux
      dispatch(setCaseProcessed({
        processed: true,
        suggestedParties: parties
      }));
      
      // If parties were found, pre-select the first two
      if (parties.length >= 2) {
        setParty1Name(parties[0].name);
        setParty1Description(parties[0].description);
        setParty2Name(parties[1].name);
        setParty2Description(parties[1].description);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to identify parties. Please enter them manually.');
    } finally {
      setPartyIdentificationLoading(false);
    }
  };

  const handleParty1SelectionChange = (e: SelectChangeEvent) => {
    const selectedName = e.target.value;
    setParty1Name(selectedName);
    
    // Update description
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty1Description(selectedParty.description);
    } else {
      setParty1Description('');
    }
  };

  const handleParty2SelectionChange = (e: SelectChangeEvent) => {
    const selectedName = e.target.value;
    setParty2Name(selectedName);
    
    // Update description
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty2Description(selectedParty.description);
    } else {
      setParty2Description('');
    }
  };

  const validateParties = () => {
    // Check if both party names are provided
    if (!party1Name.trim() || !party2Name.trim()) {
      setError('Please provide names for both parties');
      return false;
    }

    // Check if party names are unique
    if (party1Name.trim().toLowerCase() === party2Name.trim().toLowerCase()) {
      setError('Party names must be different');
      return false;
    }

    // Check if party names are meaningful (not just numbers or special characters)
    const meaningfulNameRegex = /^[a-zA-Z].*$/;
    if (!meaningfulNameRegex.test(party1Name.trim()) || !meaningfulNameRegex.test(party2Name.trim())) {
      setError('Party names must start with a letter and be meaningful');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caseContent.trim()) {
      setError('Please provide case content');
      return;
    }

    if (!validateParties()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_CASE_CONTENT, caseContent);
      localStorage.setItem(STORAGE_KEY_PARTY1_NAME, party1Name);
      localStorage.setItem(STORAGE_KEY_PARTY2_NAME, party2Name);
      
      // Create parties object
      const parties = {
        party1: {
          id: '1',
          name: party1Name.trim(),
          description: party1Description || `${party1Name.trim()} is one of the parties in this negotiation.`,
          isUserSide: true,
          idealOutcomes: []
        },
        party2: {
          id: '2',
          name: party2Name.trim(),
          description: party2Description || `${party2Name.trim()} is one of the parties in this negotiation.`,
          isUserSide: false,
          idealOutcomes: []
        }
      };
      
      // Update Redux state
      dispatch(setCase({ 
        id: Date.now().toString(), 
        content: caseContent 
      }));
      dispatch(setParties([
        {
          name: party1Name.trim(),
          description: party1Description || `${party1Name.trim()} is one of the parties in this negotiation.`,
          isPrimary: true
        },
        {
          name: party2Name.trim(),
          description: party2Description || `${party2Name.trim()} is one of the parties in this negotiation.`,
          isPrimary: true
        }
      ]));
      
      // If we haven't processed the content yet, just mark it as processed without identifying parties
      if (!currentCase?.processed) {
        dispatch(setCaseProcessed({
          processed: true,
          suggestedParties: [] // Empty array since we're not identifying parties
        }));
      }
      
      // Navigate to the next tab
      navigate('/review');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSavedData = () => {
    setOpenConfirmDialog(true);
  };

  const confirmClearData = () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY_CASE_CONTENT);
    localStorage.removeItem(STORAGE_KEY_PARTY1_NAME);
    localStorage.removeItem(STORAGE_KEY_PARTY2_NAME);
    
    // Clear state
    setCaseContentLocal('');
    setParty1Name('');
    setParty2Name('');
    setParty1Description('');
    setParty2Description('');
    setSuggestedParties([]);
    
    // Clear Redux state
    dispatch(clearState());
    
    setOpenConfirmDialog(false);
  };

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Case Setup
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Box component="div" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Case Content
                </Typography>
                <TextField
                  multiline
                  rows={10}
                  fullWidth
                  variant="outlined"
                  value={caseContent}
                  onChange={(e) => setCaseContentLocal(e.target.value)}
                  placeholder="Paste or type the case content here..."
                  sx={{ mb: 2 }}
                />
                
                {currentCase && currentCase.processed && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Case content has been processed and parties have been identified.
                  </Alert>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={identifyPartiesFromContent}
                    disabled={!caseContent.trim() || loading || partyIdentificationLoading}
                    startIcon={partyIdentificationLoading ? <CircularProgress size={20} /> : null}
                  >
                    {partyIdentificationLoading ? 'Identifying...' : 'Auto-Identify Parties'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleClearSavedData}
                  >
                    Clear Saved Data
                  </Button>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box component="div" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Party 1 (Your Side)
                </Typography>
                {suggestedParties.length > 0 ? (
                  <FormControl fullWidth error={!!error && error.includes('Party names')}>
                    <InputLabel id="party1-select-label">Select Party 1</InputLabel>
                    <Select
                      labelId="party1-select-label"
                      value={party1Name}
                      onChange={handleParty1SelectionChange}
                      label="Select Party 1"
                      required
                    >
                      {suggestedParties.map((party) => (
                        <MenuItem 
                          key={party.name} 
                          value={party.name}
                          disabled={party.name === party2Name} // Disable if already selected by Party 2
                        >
                          {party.name} {party.isPrimary ? "(Primary)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>This is your side in the negotiation</FormHelperText>
                  </FormControl>
                ) : (
                  <TextField
                    label="Party 1 Name"
                    fullWidth
                    value={party1Name}
                    onChange={(e) => setParty1Name(e.target.value)}
                    variant="outlined"
                    required
                    error={!!error && error.includes('Party names')}
                    helperText={error && error.includes('Party names') ? error : "This is your side in the negotiation"}
                  />
                )}
                
                {party1Description && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="body2">
                      {party1Description}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box component="div" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Party 2 (Other Side)
                </Typography>
                {suggestedParties.length > 0 ? (
                  <FormControl fullWidth error={!!error && error.includes('Party names')}>
                    <InputLabel id="party2-select-label">Select Party 2</InputLabel>
                    <Select
                      labelId="party2-select-label"
                      value={party2Name}
                      onChange={handleParty2SelectionChange}
                      label="Select Party 2"
                      required
                    >
                      {suggestedParties.map((party) => (
                        <MenuItem 
                          key={party.name} 
                          value={party.name}
                          disabled={party.name === party1Name} // Disable if already selected by Party 1
                        >
                          {party.name} {party.isPrimary ? "(Primary)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>This is the other side in the negotiation</FormHelperText>
                  </FormControl>
                ) : (
                  <TextField
                    label="Party 2 Name"
                    fullWidth
                    value={party2Name}
                    onChange={(e) => setParty2Name(e.target.value)}
                    variant="outlined"
                    required
                    error={!!error && error.includes('Party names')}
                    helperText={error && error.includes('Party names') ? error : "This is the other side in the negotiation"}
                  />
                )}
                
                {party2Description && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="body2">
                      {party2Description}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Continue to Analysis"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      {loading && <LoadingOverlay open={loading} message="Processing case content..." />}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Clear All Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will clear all saved data including case content, parties, analysis, and all other information. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
          <Button onClick={confirmClearData} color="error" autoFocus>
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InitialSetup; 