import { useState, useEffect, useCallback, useRef, ChangeEvent, DragEvent } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Divider,
  SelectChangeEvent,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { RootState } from '../store';
import {
  setCase,
  setParties,
  clearState,
  Party,
} from '../store/negotiationSlice';
import { api } from '../services/api';
import { extractTextFromFile, getFileTypeDescription } from '../utils/fileExtractor';
import { useLogging } from '../contexts/LoggingContext';

/**
 * InitialSetup component for entering case details and party information
 */
const InitialSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  const { logger, isLoggingInitialized } = useLogging();
  
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
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileInfo, setFileInfo] = useState<Array<{name: string; type: string}>>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Log page visit
  useEffect(() => {
    if (isLoggingInitialized && logger) {
      // Log page visit with app_global case ID since we might not have a specific case yet
      logger.logPageVisit('initial_setup', 'enter', undefined, 'app_global')
        .catch(err => console.error('Error logging page visit:', err));
      
      // Log exit on unmount
      return () => {
        logger.logPageVisit('initial_setup', 'exit', undefined, 'app_global')
          .catch(err => console.error('Error logging page exit:', err));
      };
    }
  }, [isLoggingInitialized, logger]);
  
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
      // Log the framework usage
      if (isLoggingInitialized && logger) {
        await logger.logFramework('IoA', 'generate', { 
          inputSize: caseContent.length,
          wasEdited: false
        }, 'app_global');
      }
      
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
        
        // Log the parties
        if (isLoggingInitialized && logger) {
          for (const party of result) {
            await logger.logParty(party.name, {
              partyRole: party.isPrimary ? 'primary' : 'secondary',
              partyType: party.name === result[0].name ? 'self' : 'counterpart',
              metadata: { description: party.description }
            }, 'app_global');
          }
        }
      } else {
        setError('Could not identify parties in the case. Please enter them manually.');
      }
    } catch (err) {
      console.error('Error identifying parties:', err);
      setError('Failed to identify parties. Please try again or enter them manually.');
    } finally {
      setLoading(false);
    }
  }, [caseContent, isLoggingInitialized, logger]);
  
  /**
   * Handle party selection changes
   */
  const handleParty1Change = useCallback((event: SelectChangeEvent) => {
    const selectedName = event.target.value;
    setParty1Name(selectedName);
    
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty1Description(selectedParty.description);
    }
  }, [suggestedParties]);

  const handleParty2Change = useCallback((event: SelectChangeEvent) => {
    const selectedName = event.target.value;
    setParty2Name(selectedName);
    
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty2Description(selectedParty.description);
    }
  }, [suggestedParties]);
  
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
    
    // Navigate to review page (this matches the route in MainLayout.tsx)
    navigate('/review');
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
   * Process a collection of files
   */
  const processFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    
    setFileProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      let extractedTextResult = '';
      let processedFileInfo: Array<{name: string; type: string}> = [];
      
      // Process each file in sequence
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Check file size for PDFs - warn if large
          if (file.type === 'application/pdf' && file.size > 10 * 1024 * 1024) {
            // More than 10MB
            setSuccessMessage(`Processing large PDF ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
          }
          
          const extractedText = await extractTextFromFile(file);
          
          if (!extractedText.trim()) {
            console.warn(`No text extracted from ${file.name}`);
            continue;
          }
          
          // Add file info
          processedFileInfo.push({
            name: file.name,
            type: getFileTypeDescription(file)
          });
          
          // Append text with separator
          if (extractedTextResult) {
            extractedTextResult += '\n\n-------------------\n\n';
          }
          extractedTextResult += `[Content from: ${file.name}]\n\n${extractedText}`;
          
          // Log case file upload 
          if (isLoggingInitialized && logger) {
            try {
              const { caseId } = await logger.logCaseFile(file, extractedText);
              console.log(`Case file logged with ID: ${caseId}`);
            } catch (logErr) {
              console.error('Error logging case file:', logErr);
            }
          }
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
          // Continue with other files if possible
        }
      }
      
      if (!extractedTextResult) {
        throw new Error("No text could be extracted from the uploaded file(s). They might be image-based or protected documents.");
      }
      
      // Append to existing content
      const newContent = caseContent.trim() 
        ? `${caseContent.trim()}\n\n-------------------\n\n${extractedTextResult}` 
        : extractedTextResult;
      
      // Update local state
      setCaseContent(newContent);
      
      // Update Redux state immediately
      dispatch(setCase({ 
        id: currentCase?.id || Date.now().toString(), 
        content: newContent,
        title: fileInfo.length === 1 ? fileInfo[0].name : 'Multiple Files'
      }));
      
      // Update file info
      setFileInfo(prev => [...prev, ...processedFileInfo]);
      
      if (files.length === 1) {
        setSuccessMessage(`Successfully extracted text from ${files[0].name}`);
      } else {
        setSuccessMessage(`Successfully extracted text from ${files.length} files`);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error extracting text from files:', err);
      setError(`Failed to extract text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFileProcessing(false);
    }
  };

  /**
   * Handles file selection for text extraction
   */
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    await processFiles(files);
  };

  /**
   * Triggers file input click
   */
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  /**
   * Handles drag events
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };
  
  /**
   * Clear all file info
   */
  const clearFileInfo = () => {
    setFileInfo([]);
  };
  
  /**
   * Handles text change in the case content field
   */
  const handleCaseContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value;
    setCaseContent(newContent);
    // Update Redux state immediately
    dispatch(setCase({ 
      id: currentCase?.id || Date.now().toString(), 
      content: newContent 
    }));
    // Clear success message when user edits content manually
    setSuccessMessage(null);
  }, [dispatch, currentCase?.id]);
  
  /**
   * Clear all data including case content and party information
   */
  const handleClearData = useCallback(() => {
    setCaseContent('');
    setParty1Name('');
    setParty2Name('');
    setParty1Description('');
    setParty2Description('');
    setSuggestedPartiesState([]);
    setPartiesIdentified(false);
    setError(null);
    setFileInfo([]);
    setSuccessMessage(null);
    
    // Close dialog
    setConfirmDialogOpen(false);
    
    // Clear Redux state
    dispatch(clearState());
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
  
  /**
   * Render party selection
   */
  const renderPartySelection = (
    partyNumber: 1 | 2,
    partyName: string,
    partyDescription: string,
    handleChange: (event: SelectChangeEvent) => void
  ) => {
    const label = partyNumber === 1 ? 'Party 1 (Your Side)' : 'Party 2 (Other Side)';
    const helperText = partyNumber === 1 
      ? 'This is your side in the negotiation'
      : 'This is the other side in the negotiation';
    const selectLabel = partyNumber === 1 ? 'Select Party 1' : 'Select Party 2';
    const otherPartyName = partyNumber === 1 ? party2Name : party1Name;
    
    return (
      <Grid item xs={12} md={6}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {label}
          </Typography>
          
          {suggestedParties.length > 0 && partiesIdentified ? (
            <FormControl fullWidth margin="normal">
              <InputLabel id={`party${partyNumber}-select-label`}>{selectLabel}</InputLabel>
              <Select
                labelId={`party${partyNumber}-select-label`}
                value={partyName}
                onChange={handleChange}
                label={selectLabel}
                required
              >
                {suggestedParties.map((party) => (
                  <MenuItem 
                    key={party.name} 
                    value={party.name}
                    disabled={party.name === otherPartyName} // Disable if already selected by other party
                  >
                    {party.name} {party.isPrimary ? "(Primary)" : ""}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{helperText}</FormHelperText>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label={`Party ${partyNumber} Name`}
              value={partyName}
              onChange={(e) => partyNumber === 1 ? setParty1Name(e.target.value) : setParty2Name(e.target.value)}
              margin="normal"
              variant="outlined"
              required
            />
          )}
          
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                color: 'text.primary'
              }}
            >
              {partyDescription || 'No description available.'}
            </Typography>
          </Box>
        </Box>
      </Grid>
    );
  };
  
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
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Case Content
              </Typography>
              <Box>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept=".txt,.pdf,.doc,.docx,.rtf"
                  multiple
                />
                {fileInfo.length > 0 && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ mr: 1 }}>
                      Files: {fileInfo.length}
                    </Typography>
                    <IconButton 
                      size="small" 
                      color="default" 
                      onClick={clearFileInfo}
                      title="Clear file list"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
            
            {/* Combined upload area */}
            <Box
              sx={{
                border: isDragging 
                  ? '2px dashed #2196f3'
                  : '2px dashed #cccccc',
                borderRadius: 1,
                p: 2,
                mb: 2,
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDragging ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileUpload}
            >
              <Box sx={{ textAlign: 'center', color: isDragging ? '#2196f3' : '#666' }}>
                <CloudUploadIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {fileProcessing ? 'Processing files...' : 'Upload files or drag and drop here'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: PDF, TXT, DOC, DOCX, RTF
                </Typography>
                {fileProcessing && (
                  <CircularProgress size={24} sx={{ mt: 1 }} />
                )}
              </Box>
            </Box>
            
            {/* File chips */}
            {fileInfo.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                {fileInfo.map((file, index) => (
                  <Chip
                    key={`${file.name}-${index}`}
                    icon={<DescriptionIcon />}
                    label={`${file.name} (${file.type})`}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                ))}
              </Stack>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={12}
              value={caseContent}
              onChange={handleCaseContentChange}
              placeholder="Enter or paste your case content here, or upload files using the upload area above"
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
            >
              Click "Identify Parties" to automatically detect the parties in your case. You can also enter them manually below.
            </Alert>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Party Information
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={identifyParties}
                disabled={loading || !caseContent.trim() || fileProcessing}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                sx={{ 
                  minWidth: '180px',
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  }
                }}
              >
                {loading ? 'Identifying...' : 'Identify Parties'}
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {renderPartySelection(1, party1Name, party1Description, handleParty1Change)}
              {renderPartySelection(2, party2Name, party2Description, handleParty2Change)}
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
              disabled={!caseContent.trim() || !party1Name.trim() || !party2Name.trim() || fileProcessing}
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