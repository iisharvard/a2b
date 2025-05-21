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
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { RootState } from '../store';
import {
  setCase,
  setParties,
  clearState,
  setCaseProcessed,
  Party,
  setSelectedPartyPair
} from '../store/negotiationSlice';
import { api } from '../services/api';
import { extractTextFromFile, getFileTypeDescription } from '../utils/fileExtractor';
import { useLogging } from '../contexts/LoggingContext';
import { auth } from '../firebase'; // Import Firebase auth instance

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
  const [customPartyInput, setCustomPartyInput] = useState('');
  const [customPartyDescription, setCustomPartyDescription] = useState('');
  const [customParties, setCustomParties] = useState<Array<{name: string; description: string; isPrimary: boolean}>>([]);
  
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
        // Only attempt to log page exit if the user is still authenticated
        if (auth.currentUser && isLoggingInitialized && logger) {
        logger.logPageVisit('initial_setup', 'exit', undefined, 'app_global')
            .catch(err => console.warn('Error logging page exit (user might be signing out):', err));
        } else if (isLoggingInitialized && logger) {
          console.log('User signed out or logger not available, skipping page exit log for initial_setup.');
        }
      };
    }
  }, [isLoggingInitialized, logger]);
  
  // Load case content from Redux if available
  useEffect(() => {
    if (currentCase) {
      console.log('InitialSetup useEffect [currentCase]: currentCase.suggestedParties from Redux:', JSON.stringify(currentCase.suggestedParties, null, 2));
      setCaseContent(currentCase.content || '');
      
      if (currentCase.suggestedParties && currentCase.suggestedParties.length >= 2) {
        const p1 = currentCase.suggestedParties[0];
        const p2 = currentCase.suggestedParties[1];
        
        setParty1Name(p1.name || '');
        setParty2Name(p2.name || '');
        setParty1Description(p1.description || '');
        setParty2Description(p2.description || '');
        
        // Convert all parties for the dropdown and custom parties lists
        const allParties = currentCase.suggestedParties.map(party => ({
          name: party.name,
          description: party.description,
          isPrimary: party.isPrimary
        }));
        
        // Set all parties in the dropdown
        setSuggestedPartiesState(allParties);
        
        // Set custom parties (any parties beyond the first two primary parties)
        if (currentCase.suggestedParties.length > 2) {
          const partiesToSetAsCustom = currentCase.suggestedParties.slice(2).map(party => ({
            name: party.name,
            description: party.description,
            isPrimary: party.isPrimary
          }));
          console.log('InitialSetup useEffect [currentCase]: Setting local customParties with:', JSON.stringify(partiesToSetAsCustom, null, 2));
          setCustomParties(partiesToSetAsCustom);
        } else {
          console.log('InitialSetup useEffect [currentCase]: Not setting local customParties, currentCase.suggestedParties.length <= 2 or undefined.');
          setCustomParties([]); // Ensure customParties is reset if there are no additional parties
        }
        
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
        // Save current custom parties
        const existingCustomParties = customParties;
        
        // Deduplicate parties by name - there might be duplicate parties with different descriptions
        const partyMap = new Map<string, {name: string; description: string; isPrimary: boolean}>();
        
        // Process all parties from API result
        result.forEach(party => {
          const lowerName = party.name.toLowerCase();
          if (partyMap.has(lowerName)) {
            // Merge descriptions if this is a duplicate
            const existing = partyMap.get(lowerName)!;
            const combinedDesc = existing.description.includes(party.description) 
              ? existing.description 
              : `${existing.description} ${party.isPrimary ? "(Primary role)" : ""}\n\nAlso: ${party.description}`;
            
            partyMap.set(lowerName, {
              ...existing,
              description: combinedDesc,
              isPrimary: existing.isPrimary || party.isPrimary
            });
          } else {
            partyMap.set(lowerName, party);
          }
        });
        
        // Convert map back to array
        const dedupedResult = Array.from(partyMap.values());
        
        // Identify potential duplicates between AI-identified parties and custom parties 
        const existingCustomPartyNames = existingCustomParties.map(p => p.name.toLowerCase());
        const filteredResult = dedupedResult.filter(
          p => !existingCustomPartyNames.includes(p.name.toLowerCase())
        );
        
        // Set the main parties
        const mergedParties = [...filteredResult, ...existingCustomParties];
        setSuggestedPartiesState(mergedParties);
        
        // Update main party selections if they aren't already set
        if (!party1Name || !party2Name) {
          setParty1Name(filteredResult[0]?.name || '');
          setParty2Name(filteredResult[1]?.name || '');
          setParty1Description(filteredResult[0]?.description || '');
          setParty2Description(filteredResult[1]?.description || '');
        }
        
        setPartiesIdentified(true);
        
        // Log the parties
        if (isLoggingInitialized && logger) {
          for (const party of filteredResult) {
            await logger.logParty(party.name, {
              partyRole: party.isPrimary ? 'primary' : 'secondary',
              partyType: party.name === filteredResult[0].name ? 'self' : 'counterpart',
              metadata: { description: party.description }
            }, 'app_global');
          }
        }

        // *** IMPORTANT ADDITION ***
        // Directly save the parties to Redux to ensure they are persisted immediately
        // This also ensures the parties are correctly displayed in the main toolbar
        console.log("identifyParties: Immediately saving the following parties to Redux:", JSON.stringify(mergedParties, null, 2));
        const reduxParties = mergedParties.map(party => ({
          name: party.name,
          description: party.description,
          isPrimary: party.name === (party1Name || filteredResult[0]?.name) || 
                     party.name === (party2Name || filteredResult[1]?.name)
        }));
        dispatch(setParties(reduxParties));

        // Set selected party pair (the first two primary parties)
        const p1Name = party1Name || filteredResult[0]?.name || '';
        const p2Name = party2Name || filteredResult[1]?.name || '';

        // Find indices of the selected parties to determine their assigned IDs
        let p1Index = -1;
        let p2Index = -1;
        reduxParties.forEach((party, index) => {
          if (party.name === p1Name) p1Index = index;
          if (party.name === p2Name) p2Index = index;
        });

        if (p1Index >= 0 && p2Index >= 0) {
          console.log(`identifyParties: Setting selected party pair to party-${p1Index + 1} and party-${p2Index + 1}`);
          dispatch(setSelectedPartyPair({
            party1Id: `party-${p1Index + 1}`,
            party2Id: `party-${p2Index + 1}`
          }));
        }

        // Display success message
        setSuccessMessage(`Successfully identified ${mergedParties.length} parties and saved them to storage.`);

      } else {
        setError('Could not identify parties in the case. Please enter them manually.');
      }
    } catch (err) {
      console.error('Error identifying parties:', err);
      setError('Failed to identify parties. Please try again or enter them manually.');
    } finally {
      setLoading(false);
    }
  }, [caseContent, isLoggingInitialized, logger, customParties, party1Name, party2Name, dispatch]);
  
  /**
   * Handle party selection changes
   */
  const handleParty1Change = useCallback((event: SelectChangeEvent) => {
    const selectedName = event.target.value;
    const previousName = party1Name;
    
    setParty1Name(selectedName);
    
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty1Description(selectedParty.description);
    }
  }, [suggestedParties, party1Name]);

  const handleParty2Change = useCallback((event: SelectChangeEvent) => {
    const selectedName = event.target.value;
    const previousName = party2Name;
    
    setParty2Name(selectedName);
    
    const selectedParty = suggestedParties.find(party => party.name === selectedName);
    if (selectedParty) {
      setParty2Description(selectedParty.description);
    }
  }, [suggestedParties, party2Name]);
  
  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(() => {
    console.log("🛑 handleSubmit FUNCTION CALLED 🛑");
    
    if (!caseContent.trim()) {
      setError('Please enter case content.');
      console.log("⚠️ handleSubmit validation failed: No case content");
      return;
    }
    
    if (!party1Name.trim() || !party2Name.trim()) {
      setError('Please enter names for both primary parties.');
      console.log("⚠️ handleSubmit validation failed: Missing party names");
      return;
    }

    console.log("✅ handleSubmit validations passed, preparing to dispatch parties");
    
    // Use the locally managed suggestedPartiesState which contains all identified parties
    // Mark the selected party1Name and party2Name as primary.
    const updatedParties = suggestedParties.map(party => ({
      ...party, // Spread existing properties like name, description
      isPrimary: party.name === party1Name || party.name === party2Name
    }));

    // Ensure that if party1Name or party2Name were manually typed and are not in suggestedParties, they are added.
    // This is a fallback, ideally selection enforces they are from the list.
    if (!updatedParties.some(p => p.name === party1Name)) {
      updatedParties.push({ name: party1Name, description: party1Description, isPrimary: true });
    }
    if (!updatedParties.some(p => p.name === party2Name)) {
      updatedParties.push({ name: party2Name, description: party2Description, isPrimary: true });
    }
    
    // Deduplicate in case of manual additions that might already exist by name
    const finalPartiesMap = new Map<string, {name: string; description: string; isPrimary: boolean}>();
    updatedParties.forEach(p => {
      if (!finalPartiesMap.has(p.name) || p.isPrimary) { // Prioritize primary marking
        finalPartiesMap.set(p.name, p);
      }
    });
    const finalUpdatedParties = Array.from(finalPartiesMap.values());

    console.log('handleSubmit: finalUpdatedParties being dispatched:', JSON.stringify(finalUpdatedParties, null, 2));
    console.log('handleSubmit: party1Name:', party1Name, 'party2Name:', party2Name);
    console.log('handleSubmit: local suggestedPartiesState:', JSON.stringify(suggestedParties, null, 2));
    
    // Save to Redux
    // Ensure currentCase ID is preserved if it exists, otherwise generate new one.
    const caseId = currentCase?.id || Date.now().toString();
    dispatch(setCase({ 
      id: caseId, 
      content: caseContent 
    }));
    dispatch(setParties(finalUpdatedParties)); // Dispatch the comprehensive list
    
    // setSelectedPartyPair expects party IDs (e.g., party-1, party-2)
    // We need to find the IDs from finalUpdatedParties that correspond to party1Name and party2Name
    const p1 = finalUpdatedParties.find(p => p.name === party1Name);
    const p2 = finalUpdatedParties.find(p => p.name === party2Name);

    // The setParties action assigns IDs like 'party-1', 'party-2'. 
    // We need to rely on the order for the default selection here for now,
    // or ideally get the generated IDs back if setParties was synchronous (which it isn't directly).
    // For simplicity, assuming the first two primary parties in the list are party-1 and party-2 by convention after setParties runs.
    // This might need refinement if party IDs are not strictly party-1, party-2 for the first two primaries.

    // Find the actual IDs that will be assigned by setParties reducer.
    // The setParties reducer maps the payload index to party- (index+1).
    let p1AssignedId = '';
    let p2AssignedId = '';

    finalUpdatedParties.forEach((party, index) => {
      if (party.name === party1Name) p1AssignedId = `party-${index + 1}`;
      if (party.name === party2Name) p2AssignedId = `party-${index + 1}`;
    });

    if (p1AssignedId && p2AssignedId) {
      dispatch(setSelectedPartyPair({
        party1Id: p1AssignedId, 
        party2Id: p2AssignedId
      }));
    } else {
      // Fallback if names didn't match, select first two as default
      // This case should be rare if UI enforces selection from list properly.
      if (finalUpdatedParties.length >= 2) {
        dispatch(setSelectedPartyPair({
          party1Id: `party-1`, 
          party2Id: `party-2`
        }));
      }
      console.warn('handleSubmit: Could not find assigned IDs for selected party names, defaulted to party-1/2');
    }
    
    navigate('/review');
  }, [
    caseContent,
    party1Name,
    party2Name,
    party1Description, // Added to dependency array
    party2Description, // Added to dependency array
    customParties, // Kept for now, though its direct use in updatedParties is removed
    suggestedParties, // Added local suggestedPartiesState to dependency array
    dispatch,
    navigate,
    currentCase?.id // Added currentCase.id for stable caseId generation
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
              // Continue with processing even if Firebase storage upload fails
              // File content is still available in the text area
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
    setCustomParties([]);
    setCustomPartyInput('');
    setCustomPartyDescription('');
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
   * Add a custom party
   */
  const addCustomParty = useCallback(() => {
    if (!customPartyInput.trim()) {
      return;
    }
    
    // Split by commas and process each party
    const partyNames = customPartyInput.split(',').map(name => name.trim()).filter(name => name);
    
    if (partyNames.length === 0) return;
    
    // Track any duplicate names to report to the user
    const duplicates: string[] = [];
    const newParties: Array<{name: string; description: string; isPrimary: boolean}> = [];
    
    // Process each party name
    partyNames.forEach(partyName => {
      // Check for duplicates
      const isDuplicate = [party1Name, party2Name]
        .concat(customParties.map(p => p.name))
        .concat(newParties.map(p => p.name)) // Also check against parties we're about to add
        .some(name => name.toLowerCase() === partyName.toLowerCase());
      
      if (isDuplicate) {
        duplicates.push(partyName);
        return;
      }
      
      // Create the new party object
      const newParty = {
        name: partyName,
        description: customPartyDescription.trim() || `Additional party: ${partyName}`,
        isPrimary: false
      };
      
      newParties.push(newParty);
    });
    
    // Add the new parties if any valid ones were found
    if (newParties.length > 0) {
      // Add to custom parties list
      setCustomParties(prev => [...prev, ...newParties]);
      
      // Also add to the dropdown options
      setSuggestedPartiesState(prev => [...prev, ...newParties]);
      
      // Ensure we show dropdown menus
      setPartiesIdentified(true);
      
      // Select first two parties as Party 1 and Party 2 if not already selected
      if (!party1Name && suggestedParties.length === 0 && newParties.length > 0) {
        setParty1Name(newParties[0].name);
        setParty1Description(newParties[0].description);
      }
      
      if (!party2Name && suggestedParties.length === 0 && newParties.length > 1) {
        setParty2Name(newParties[1].name);
        setParty2Description(newParties[1].description);
      }
      
      // Clear inputs
      setCustomPartyInput('');
      setCustomPartyDescription('');
      setError(null);
      
      // Show success message if multiple parties were added
      if (newParties.length > 1) {
        setSuccessMessage(`Added ${newParties.length} parties: ${newParties.map(p => p.name).join(', ')}`);
      }
    }
    
    // Show error for duplicates if any were found
    if (duplicates.length > 0) {
      setError(`The following parties already exist: ${duplicates.join(', ')}`);
    }
  }, [customPartyInput, customPartyDescription, party1Name, party2Name, customParties, suggestedParties]);

  /**
   * Remove a custom party
   */
  const removeCustomParty = useCallback((partyName: string) => {
    // Remove from custom parties list
    setCustomParties(prev => prev.filter(party => party.name !== partyName));
    
    // Also remove from dropdown options if it's not selected for either party
    if (partyName !== party1Name && partyName !== party2Name) {
      setSuggestedPartiesState(prev => prev.filter(party => party.name !== partyName));
    }
  }, [party1Name, party2Name]);
  
  /**
   * Handle key press for custom party input
   */
  const handleCustomPartyKeyPress = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && customPartyInput.trim()) {
      e.preventDefault();
      addCustomParty();
    }
  }, [addCustomParty, customPartyInput]);
  
  /**
   * Handle key press for custom party description (don't submit on Enter)
   */
  const handleDescriptionKeyPress = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Allow Enter for new lines in the description
    if (e.key === 'Enter' && e.ctrlKey && customPartyInput.trim()) {
      e.preventDefault();
      addCustomParty();
    }
  }, [addCustomParty, customPartyInput]);
  
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
          {/* Case Content Card */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader 
                title="Case Content" 
                action={
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
                }
              />
              <CardContent>
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
                  rows={8}
                  value={caseContent}
                  onChange={handleCaseContentChange}
                  placeholder="Enter or paste your case content here, or upload files using the upload area above"
                  variant="outlined"
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* Party Information Card */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <GroupsIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Party Information</Typography>
                  </Box>
                }
                action={
                  <Box sx={{ display: 'flex', gap: 2 }}>
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
                }
                subheader="Select or add parties involved in the negotiation"
              />
              <CardContent>
                <Alert 
                  severity="info" 
                  sx={{ mb: 3 }}
                  icon={<PersonIcon />}
                >
                  You must select primary parties for both sides of the negotiation. Additional parties can be added below.
                </Alert>
                
                {/* Unified party management table */}
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell width="30%"><strong>Party Name</strong></TableCell>
                        <TableCell width="50%"><strong>Description</strong></TableCell>
                        <TableCell width="20%"><strong>Role</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Party 1 Row */}
                      <TableRow sx={{ bgcolor: 'rgba(144, 202, 249, 0.1)' }}>
                        <TableCell>
                          {suggestedParties.length > 0 ? (
                            <FormControl fullWidth variant="outlined" size="small">
                              <InputLabel id="party1-select-label">Party 1 (Your Side)</InputLabel>
                              <Select
                                labelId="party1-select-label"
                                value={party1Name}
                                onChange={handleParty1Change}
                                label="Party 1 (Your Side)"
                                required
                              >
                                {suggestedParties.map((party, index) => (
                                  <MenuItem 
                                    key={`${party.name}-${index}`} 
                                    value={party.name}
                                    disabled={party.name === party2Name}
                                  >
                                    {party.name}{' '}
                                    {party.isPrimary ? "(Primary)" : ""}
                                    {customParties.some(p => p.name === party.name) ? " (Custom)" : ""}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              fullWidth
                              label="Party 1 Name"
                              value={party1Name}
                              onChange={(e) => setParty1Name(e.target.value)}
                              variant="outlined"
                              size="small"
                              required
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              color: 'text.primary',
                              maxHeight: '100px',
                              overflow: 'auto'
                            }}
                          >
                            {party1Description || 'No description available.'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Your Side" 
                            color="primary" 
                            size="small"
                            icon={<CheckCircleIcon />}
                          />
                        </TableCell>
                      </TableRow>
                      
                      {/* Party 2 Row */}
                      <TableRow sx={{ bgcolor: 'rgba(229, 115, 115, 0.05)' }}>
                        <TableCell>
                          {suggestedParties.length > 0 ? (
                            <FormControl fullWidth variant="outlined" size="small">
                              <InputLabel id="party2-select-label">Party 2 (Other Side)</InputLabel>
                              <Select
                                labelId="party2-select-label"
                                value={party2Name}
                                onChange={handleParty2Change}
                                label="Party 2 (Other Side)"
                                required
                              >
                                {suggestedParties.map((party, index) => (
                                  <MenuItem 
                                    key={`${party.name}-${index}`} 
                                    value={party.name}
                                    disabled={party.name === party1Name}
                                  >
                                    {party.name}{' '}
                                    {party.isPrimary ? "(Primary)" : ""}
                                    {customParties.some(p => p.name === party.name) ? " (Custom)" : ""}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              fullWidth
                              label="Party 2 Name"
                              value={party2Name}
                              onChange={(e) => setParty2Name(e.target.value)}
                              variant="outlined"
                              size="small"
                              required
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              color: 'text.primary',
                              maxHeight: '100px',
                              overflow: 'auto'
                            }}
                          >
                            {party2Description || 'No description available.'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Other Side" 
                            color="error" 
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                      
                      {/* Custom Parties */}
                      {customParties.map((party) => (
                        <TableRow key={party.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {party.name}
                              </Typography>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => removeCustomParty(party.name)}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                whiteSpace: 'pre-wrap',
                                color: 'text.secondary',
                                maxHeight: '60px',
                                overflow: 'auto'
                              }}
                            >
                              {party.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label="Additional" 
                              color="default" 
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Add Custom Parties Section - Simplified UI */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                      Add Additional Parties
                    </Typography>
                    
                    <Autocomplete
                      freeSolo
                      options={[]}
                      inputValue={customPartyInput}
                      onInputChange={(_, value) => setCustomPartyInput(value)}
                      multiple
                      id="custom-parties-input"
                      renderTags={() => null}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Enter parties separated by commas (e.g., Lawyer, Judge, Mediator)"
                          helperText="Press Enter or comma to add multiple parties at once"
                          size="small"
                          fullWidth
                          sx={{ mb: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customPartyInput) {
                              e.preventDefault();
                              addCustomParty();
                            }
                          }}
                        />
                      )}
                    />
                    
                    <TextField
                      label="Description (applied to all added parties)"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={customPartyDescription}
                      onChange={(e) => setCustomPartyDescription(e.target.value)}
                      multiline
                      rows={2}
                      onKeyPress={handleDescriptionKeyPress}
                      sx={{ mb: 2 }}
                    />
                    
                    <Button 
                      variant="contained" 
                      onClick={addCustomParty}
                      disabled={!customPartyInput.trim()}
                      startIcon={<PersonIcon />}
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      Add Party
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Action Buttons */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={openConfirmDialog}
              startIcon={<CloseIcon />}
            >
              Clear All Data
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                console.log("Continue to Analysis button clicked - calling handleSubmit()");
                handleSubmit();
              }}
              disabled={!caseContent.trim() || !party1Name.trim() || !party2Name.trim() || fileProcessing}
              endIcon={<CheckCircleIcon />}
              size="large"
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