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
  Divider,
  CircularProgress,
  Card,
  CardContent,
  ListItemButton,
  List,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { RootState } from '../store';
import { 
  setScenarios, 
  selectScenario, 
  Scenario
} from '../store/negotiationSlice';
import { 
  setScenariosRecalculated
} from '../store/recalculationSlice';
import { api } from '../services/api';
import { clearScenariosForComponent } from '../services/api/cache';
import ScenarioSpectrum from '../components/ScenarioSpectrum';
import RecalculationWarning from '../components/RecalculationWarning';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import React, { ReactNode } from 'react';
import { useLogging } from '../contexts/LoggingContext';
import { truncateText } from '../utils/textUtils';

const NegotiationScenario = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logger, isLoggingInitialized } = useLogging();
  
  // Redux state
  const { currentCase, selectedScenario } = useSelector(
    (state: RootState) => state.negotiation
  );
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);
  
  // Local state
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingIssueIds, setGeneratingIssueIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | ReactNode | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [loadedScenarios, setLoadedScenarios] = useState<string[]>([]);
  
  // Ref to track whether auto-generation has run to prevent duplicate generation
  const autoGenerationRan = useRef(false);
  // Ref to track if the initial setup effect has already been run for a specific case
  const initialSetupRan = useRef<{caseId: string | null, count: number}>({caseId: null, count: 0});
  
  // Add state for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Reset function to clear loaded scenarios when needed
  const resetLoadedScenariosForComponent = useCallback((componentId: string) => {
    setLoadedScenarios(prev => 
      prev.filter(id => {
        const scenario = currentCase?.scenarios.find(s => s.id === id);
        return scenario?.componentId !== componentId;
      })
    );
  }, [currentCase]);

  // Derived state
  const selectedIssue = currentCase?.analysis?.components.find(
    (c) => c.id === selectedIssueId
  );
  
  // Filter and limit to 5 scenarios per component
  const filteredScenarios = currentCase?.scenarios
    .filter(s => s.componentId === selectedIssueId)
    .slice(0, 5) || [];

  const needsRecalculation = !recalculationStatus.scenariosRecalculated && 
    recalculationStatus.analysisRecalculated;

  // Get party names for display
  const party1Name = currentCase?.suggestedParties[0]?.name || 'Party 1';
  const party2Name = currentCase?.suggestedParties[1]?.name || 'Party 2';

  // Helper function to check if a specific issue is generating
  const isGeneratingIssue = (issueId: string) => generatingIssueIds.has(issueId);
  // Helper function to check if any issue is generating
  const isAnyIssueGenerating = () => generatingIssueIds.size > 0;

  // Get the text for the regenerate button based on generation state
  const getRegenerateButtonText = () => {
    if (isGeneratingIssue(selectedIssueId)) {
      return 'Generating...';
    } else if (isAnyIssueGenerating()) {
      return 'Generation in progress...';
    } else {
      return 'Regenerate Scenarios';
    }
  };

  // Generate scenarios for all components
  const generateAllScenarios = useCallback(async () => {
    if (!currentCase || !currentCase.analysis || isGeneratingAll) return;
    
    setIsGeneratingAll(true);
    setError(null);
    
    try {
      // console.log('Generating scenarios for all components...');
      
      // Track whether we're currently generating scenarios
      let generatingCount = 0;
      
      // Track which components we already have scenarios for to avoid redundant generation
      const componentsWithScenarios = new Set(
        currentCase.scenarios
          .map(s => s.componentId)
          .filter(id => loadedScenarios.some(loadedId => 
            currentCase.scenarios.find(s => s.id === loadedId && s.componentId === id)
          ))
      );
      
      // console.log('Components with scenarios already loaded:', [...componentsWithScenarios]);
      
      // Loop through all components and generate scenarios for each
      for (const component of currentCase.analysis.components) {
        // Skip if we already have scenarios for this component and they don't need recalculation
        const existingScenarios = currentCase.scenarios.filter(
          (s) => s.componentId === component.id
        );
        
        const scenariosLoaded = existingScenarios.some(s => loadedScenarios.includes(s.id));
        
        if ((existingScenarios.length > 0 && recalculationStatus.scenariosRecalculated) || 
            componentsWithScenarios.has(component.id) ||
            scenariosLoaded) {
          // console.log(`Using existing scenarios for component: ${component.id} (${component.name})`);
          
          // Mark all existing scenarios as loaded
          setLoadedScenarios(prev => {
            const newLoaded = [...prev];
            existingScenarios.forEach(scenario => {
              if (!newLoaded.includes(scenario.id)) {
                newLoaded.push(scenario.id);
              }
            });
            return newLoaded;
          });
          
          // Add to our tracking set
          componentsWithScenarios.add(component.id);
          continue;
        }
        
        // Generate scenarios for this component
        generatingCount++;
        
        // Add this component to the generating set
        setGeneratingIssueIds(prev => {
          const newSet = new Set(prev);
          newSet.add(component.id);
          return newSet;
        });
        
        try {
          // console.log(`Generating scenarios for component: ${component.id} (${component.name})`);
          
          // Use the generateScenarios method directly
          const newScenarios = await api.generateScenarios(component.id, (scenario) => {
            // Mark each scenario as loaded as it comes in
            setLoadedScenarios(prev => [...prev, scenario.id]);
          });
          
          // Ensure newScenarios is an array and limit to exactly 5 scenarios
          const scenariosArray = Array.isArray(newScenarios) ? newScenarios.slice(0, 5) : [];
          // console.log(`Generated ${scenariosArray.length} scenarios for component: ${component.id}`);
          
          // Make sure each scenario has a unique ID that includes the component ID
          // We're explicitly setting the IDs 1-5 to ensure they're unique and consistent
          const uniqueScenarios = scenariosArray.map((scenario, index) => ({
            ...scenario,
            id: `${component.id}-${index + 1}`
          }));
          
          // First, remove any existing scenarios for this component
          const filteredScenarios = currentCase.scenarios.filter(
            s => s.componentId !== component.id
          );
          
          // Then update Redux state with the filtered scenarios + new ones
          dispatch(setScenarios([...filteredScenarios, ...uniqueScenarios]));
          
          // Log successful scenario generation for this component
          if (isLoggingInitialized && logger && logger.getCaseId(true)) {
            logger.logFramework(
              'Redline',
              'generate',
              { 
                inputSize: component.description?.length || 0, 
                wasEdited: false,
                frameworkContent: truncateText(JSON.stringify(uniqueScenarios))
              },
              logger.getCaseId(true)
            ).catch(err => console.error(`Error logging scenario generation for component ${component.id}:`, err));
          }

          componentsWithScenarios.add(component.id);
          generatingCount--;
        } catch (err: any) {
          console.error(`Error generating scenarios for component ${component.id}:`, err);
          generatingCount--;
          // Continue with other components, don't stop the whole process
        } finally {
          // Remove this component from the generating set
          setGeneratingIssueIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(component.id);
            return newSet;
          });
        }
      }
      
      // Mark scenarios as recalculated if they were generated due to analysis changes
      if (!recalculationStatus.scenariosRecalculated) {
        dispatch(setScenariosRecalculated(true));
      }
      
      if (generatingCount === 0) {
        setError('All scenarios have been successfully generated.');
      }
    } catch (err: any) {
      console.error('Error in generateAllScenarios:', err);
      
      if (err.message?.includes('Network error')) {
        setError(
          <Box>
            <Typography gutterBottom>
              Network error: Unable to connect to the AI service. Please check your internet connection.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={executeRegenerateAll}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry All
            </Button>
          </Box>
        );
      } else if (err.message?.includes('rate limit')) {
        setError(
          <Box>
            <Typography gutterBottom>
              Rate limit reached. Please wait a moment before trying again.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={() => setTimeout(executeRegenerateAll, 5000)}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry All in 5 seconds
            </Button>
          </Box>
        );
      } else {
        setError(
          <Box>
            <Typography gutterBottom>
              Failed to generate all scenarios: {err.message || 'Unknown error'}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={executeRegenerateAll}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry All
            </Button>
          </Box>
        );
      }
    } finally {
      setIsGeneratingAll(false);
    }
  }, [currentCase, dispatch, recalculationStatus.scenariosRecalculated, isGeneratingAll, loadedScenarios, isLoggingInitialized, logger]);

  // Handle scenario generation for a specific issue
  const generateScenariosForIssue = useCallback(async (componentId: string, forceRefresh = false) => {
    if (!currentCase || !componentId) return;
    
    // Start the generation process - add this issue to the generating set
    setGeneratingIssueIds(prev => {
      const newSet = new Set(prev);
      newSet.add(componentId);
      return newSet;
    });
    setError(null);
    
    try {
      console.log(`Generating scenarios for issue: ${componentId}${forceRefresh ? ' (forced refresh)' : ''}`);
      
      // Clear loaded scenarios for this component if we're forcing a refresh
      if (forceRefresh) {
        // Reset the loaded scenarios for this component
        resetLoadedScenariosForComponent(componentId);
        
        // Clear the API cache for this component
        clearScenariosForComponent(componentId);
        
        // Remove existing scenarios from Redux to show clean UI
        const filteredScenarios = currentCase.scenarios.filter(
          s => s.componentId !== componentId
        );
        dispatch(setScenarios(filteredScenarios));
      }
      
      // Always use the regular generateScenarios method - don't try to use forceGenerateScenarios
      const newScenarios = await api.generateScenarios(componentId, (scenario) => {
        // Mark each scenario as loaded as it comes in
        setLoadedScenarios(prev => [...prev, scenario.id]);
      });
      
      // Ensure newScenarios is an array and limit to exactly 5 scenarios
      const scenariosArray = Array.isArray(newScenarios) ? newScenarios.slice(0, 5) : [];
      console.log(`Generated ${scenariosArray.length} scenarios for issue: ${componentId}`);
      
      // Make sure each scenario has a unique ID that includes the component ID
      // We're explicitly setting the IDs 1-5 to ensure they're unique and consistent
      const uniqueScenarios = scenariosArray.map((scenario, index) => ({
        ...scenario,
        id: `${componentId}-${index + 1}`
      }));
      
      // Update Redux state - make sure to include only fresh scenarios for this component
      const existingScenarios = currentCase.scenarios.filter(
        s => s.componentId !== componentId
      );
      dispatch(setScenarios([...existingScenarios, ...uniqueScenarios]));
      
      // Log successful scenario generation for this specific issue
      if (isLoggingInitialized && logger && logger.getCaseId(true)) {
        const currentComponent = currentCase.analysis?.components.find(c => c.id === componentId);
        logger.logFramework(
          'Redline', 
          'generate',
          { 
            inputSize: currentComponent?.description?.length || 0, 
            wasEdited: false,
            frameworkContent: truncateText(JSON.stringify(uniqueScenarios))
          },
          logger.getCaseId(true)
        ).catch(err => console.error(`Error logging scenario generation for issue ${componentId}:`, err));
      }

      if (!recalculationStatus.scenariosRecalculated) {
        dispatch(setScenariosRecalculated(true));
      }
      
      setError(`Scenarios for ${selectedIssue?.name || 'this issue'} were successfully generated.`);
    } catch (err: any) {
      console.error(`Error generating scenarios for issue ${componentId}:`, err);
      
      // Handle different types of errors with appropriate user-friendly messages
      if (err.message?.includes('Network error')) {
        setError(
          <Box>
            <Typography gutterBottom>
              Network error: Unable to connect to the AI service. Please check your internet connection.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={() => generateScenariosForIssue(componentId, true)}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Box>
        );
      } else if (err.message?.includes('rate limit')) {
        setError(
          <Box>
            <Typography gutterBottom>
              Rate limit reached. Please wait a moment before trying again.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={() => setTimeout(() => generateScenariosForIssue(componentId, true), 5000)}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry in 5 seconds
            </Button>
          </Box>
        );
      } else if (err.message?.includes('Component with ID') || err.message?.includes('not found')) {
        console.error(`Component not found error: ${err.message}`);
        setError(`Could not find component information for the selected issue. Please try selecting a different issue.`);
      } else if (err.message?.includes('party information missing')) {
        console.error(`Party information missing: ${err.message}`);
        setError(`Party information is missing. Please ensure parties are defined before generating scenarios.`);
      } else {
        console.error(`Error generating scenarios for issue ${componentId}:`, err);
        setError(
          <Box>
            <Typography gutterBottom>
              Failed to generate scenarios: {err.message || 'Unknown error'}. Please try again later.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              onClick={() => generateScenariosForIssue(componentId, true)}
              startIcon={<RefreshIcon />}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Box>
        );
      }
    } finally {
      // Remove this issue from the generating set once done
      setGeneratingIssueIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(componentId);
        return newSet;
      });
    }
  }, [currentCase, dispatch, recalculationStatus.scenariosRecalculated, selectedIssue?.name, resetLoadedScenariosForComponent, isLoggingInitialized, logger]);

  // Initial setup - check if we have a case, then select first issue
  useEffect(() => {
    // Skip this effect if we have already processed it
    if (!currentCase || !currentCase.analysis) {
      navigate('/boundaries');
      return;
    }

    // Check if we've already run the initial setup for this case
    if (initialSetupRan.current.caseId === currentCase.id) {
      // If we've run this more than once, log with a counter for debugging
      if (initialSetupRan.current.count > 0) {
        console.log(`Initial setup effect re-run #${initialSetupRan.current.count + 1} for case ${currentCase.id}`);
      }
      initialSetupRan.current.count++;
      return;
    }

    // Mark that we're running this setup for the first time for this case
    console.log('Running initial setup effect for case:', currentCase.id);
    initialSetupRan.current = {caseId: currentCase.id, count: 0};
    
    // Clean up any potential duplicate scenarios
    // This helps resolve any existing data with more than 5 scenarios per component
    if (currentCase.scenarios.length > 0) {
      const componentsMap = new Map<string, Scenario[]>();
      
      // Group scenarios by component
      currentCase.scenarios.forEach(scenario => {
        if (!componentsMap.has(scenario.componentId)) {
          componentsMap.set(scenario.componentId, []);
        }
        componentsMap.get(scenario.componentId)?.push(scenario);
      });
      
      // Check if any component has more than 5 scenarios
      let needsCleanup = false;
      componentsMap.forEach((scenarios, componentId) => {
        if (scenarios.length > 5) {
          needsCleanup = true;
        }
      });
      
      // If we have any components with more than 5 scenarios, clean them up
      if (needsCleanup) {
        console.log('Cleaning up scenarios to ensure at most 5 per component');
        
        let cleanedScenarios: Scenario[] = [];
        componentsMap.forEach((scenarios, componentId) => {
          // Sort by ID to ensure consistent ordering and take only the first 5
          scenarios.sort((a: Scenario, b: Scenario) => a.id.localeCompare(b.id));
          const limitedScenarios = scenarios.slice(0, 5).map((scenario: Scenario, index: number) => ({
            ...scenario,
            id: `${componentId}-${index + 1}`
          }));
          cleanedScenarios = [...cleanedScenarios, ...limitedScenarios];
        });
        
        // Update Redux with cleaned scenarios
        dispatch(setScenarios(cleanedScenarios));
      }
    }
    
    // Only set the first component as selected if no issue is already selected
    if (currentCase.analysis.components.length > 0 && !selectedIssueId) {
      const firstComponentId = currentCase.analysis.components[0].id;
      setSelectedIssueId(firstComponentId);
      
      // Mark any existing scenarios for this component as loaded
      if (currentCase.scenarios.length > 0) {
        const existingScenarios = currentCase.scenarios.filter(
          s => s.componentId === firstComponentId
        );
        
        if (existingScenarios.length > 0) {
          // Check if we need to update loadedScenarios
          const needToUpdateLoaded = existingScenarios.some(scenario => 
            !loadedScenarios.includes(scenario.id)
          );
          
          if (needToUpdateLoaded) {
            setLoadedScenarios(prev => {
              const newLoaded = [...prev];
              existingScenarios.forEach(scenario => {
                if (!newLoaded.includes(scenario.id)) {
                  newLoaded.push(scenario.id);
                }
              });
              return newLoaded;
            });
          }
        }
      }
    }
    
    // Prevent duplicate generation - only run auto-generation once
    if (autoGenerationRan.current) {
      console.log('Auto-generation already ran, skipping redundant generation');
      return;
    }
    
    // Set the flag immediately to prevent other renders from triggering generation
    autoGenerationRan.current = true;
    
    // Check if we need to generate all scenarios
    const needToGenerateAll = currentCase.analysis.components.some(component => {
      // Check if this component has scenarios
      const hasScenarios = currentCase.scenarios.some(s => s.componentId === component.id);
      return !hasScenarios || !recalculationStatus.scenariosRecalculated;
    });
    
    // Generate all scenarios when the page first loads if they don't exist or need recalculation
    if (currentCase.analysis.components.length > 0 && needToGenerateAll) {
      console.log('Automatic generation of all scenarios triggered for case:', currentCase.id);
      generateAllScenarios();
    } else {
      console.log('Using existing scenarios - no automatic generation needed for case:', currentCase.id);
      
      // Check if we need to update loadedScenarios
      if (currentCase.scenarios.length > 0) {
        const needToUpdateLoaded = currentCase.scenarios.some(
          scenario => !loadedScenarios.includes(scenario.id)
        );
        
        if (needToUpdateLoaded) {
          console.log('Updating loadedScenarios list with existing scenarios');
          setLoadedScenarios(prev => {
            const newLoaded = [...prev];
            currentCase.scenarios.forEach(scenario => {
              if (!newLoaded.includes(scenario.id)) {
                newLoaded.push(scenario.id);
              }
            });
            return newLoaded;
          });
        }
      }
    }
    // We're intentionally only running this on initial mount and when currentCase changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCase, navigate]);

  // Load scenarios when issue is selected
  useEffect(() => {
    if (!selectedIssueId || !currentCase || isGeneratingAll) {
      return;
    }

    console.log(`Checking if scenarios need to be generated for issue: ${selectedIssueId}`);

    // Check if we already have scenarios for this issue in Redux
    const existingScenarios = currentCase.scenarios.filter(
      (s) => s.componentId === selectedIssueId
    );
    
    // If we have scenarios and they don't need recalculation, use them
    if (existingScenarios.length > 0 && recalculationStatus.scenariosRecalculated) {
      console.log(`Using ${existingScenarios.length} existing scenarios for issue: ${selectedIssueId}`);
      
      // Check if we need to update loadedScenarios
      const needToUpdateLoaded = existingScenarios.some(scenario => 
        !loadedScenarios.includes(scenario.id)
      );
      
      // Only update state if needed - prevent unnecessary rerenders
      if (needToUpdateLoaded) {
        console.log(`Marking ${existingScenarios.length} existing scenarios as loaded for issue: ${selectedIssueId}`);
        // Mark all existing scenarios as loaded
        setLoadedScenarios(prev => {
          const newLoaded = [...prev];
          existingScenarios.forEach(scenario => {
            if (!newLoaded.includes(scenario.id)) {
              newLoaded.push(scenario.id);
            }
          });
          return newLoaded;
        });
      }
      return;
    }

    // Check if scenarios for this issue are already in the loaded scenarios list
    const hasLoadedScenarios = existingScenarios.some(scenario => 
      loadedScenarios.includes(scenario.id)
    );
    
    if (hasLoadedScenarios) {
      console.log(`Scenarios for issue ${selectedIssueId} already loaded, skipping generation`);
      return;
    }

    // Generate scenarios if we don't have them or they need to be recalculated
    if ((existingScenarios.length === 0 || !recalculationStatus.scenariosRecalculated) && !isGeneratingIssue(selectedIssueId)) {
      console.log(`Triggering scenario generation for issue: ${selectedIssueId} (missing: ${existingScenarios.length === 0}, needs recalc: ${!recalculationStatus.scenariosRecalculated})`);
      generateScenariosForIssue(selectedIssueId, false);
    }
  }, [currentCase, selectedIssueId, recalculationStatus.scenariosRecalculated, generateScenariosForIssue, loadedScenarios, isGeneratingAll, isGeneratingIssue]);

  // Event Handlers
  const handleIssueChange = (issueId: string) => {
    if (issueId !== selectedIssueId) {
      // Only change if we're selecting a different issue
      setSelectedIssueId(issueId);
      // Reset selected scenario when changing issues
      dispatch(selectScenario(null));
    }
  };

  const handleSelectScenario = (scenario: Scenario) => {
    console.log('Selecting scenario:', scenario.id);
    
    if (selectedScenario && selectedScenario.id === scenario.id) {
      // If clicking the same scenario, deselect it
      console.log('Deselecting current scenario');
      dispatch(selectScenario(null));
    } else {
      // If selecting a different scenario
      console.log('Selecting new scenario, previous:', selectedScenario?.id);
      dispatch(selectScenario(scenario));
    }
  };

  // Updated handler to clear cache and force regeneration
  const executeRegenerateAll = () => {
    if (isAnyIssueGenerating()) return;
    
    // Close the dialog if it's open
    setConfirmDialogOpen(false);
    
    // Reset the flags to allow manual regeneration
    console.log('Resetting generation flags for manual regeneration');
    autoGenerationRan.current = false;
    initialSetupRan.current = {caseId: null, count: 0};
    
    // Clear all loaded scenarios
    setLoadedScenarios([]);
    
    // Clear all scenarios from the store
    if (currentCase && currentCase.analysis) {
      // Clear the API cache for all components
      currentCase.analysis.components.forEach(component => {
        clearScenariosForComponent(component.id);
      });
      
      // Remove all scenarios from Redux
      dispatch(setScenarios([]));
    }
    
    // Generate all scenarios
    generateAllScenarios();
  };
  
  // Open confirmation dialog
  const handleOpenConfirmDialog = () => {
    if (isAnyIssueGenerating()) return;
    setConfirmDialogOpen(true);
  };
  
  // Close confirmation dialog
  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
  };

  const handleGenerateScenarios = () => {
    // Don't generate if any issue is currently generating or if no issue is selected
    if (!selectedIssueId || isAnyIssueGenerating()) return;
    
    // Reset the flag for manual regeneration of a specific issue
    console.log('Manual regeneration of scenarios for issue:', selectedIssueId);
    autoGenerationRan.current = true; // We still want to keep this true to prevent auto-generation
    generateScenariosForIssue(selectedIssueId, true);
  };

  const handleUpdateScenario = (updatedScenario: Scenario) => {
    if (!currentCase) return;
    
    try {
      const updatedScenarios = currentCase.scenarios.map(scenario => 
        scenario.id === updatedScenario.id ? updatedScenario : scenario
      );
      dispatch(setScenarios(updatedScenarios));
      
      if (isLoggingInitialized && logger && logger.getCaseId(true)) {
        logger.logFramework(
          'Redline',
          'edit',
          { 
            inputSize: updatedScenario.description.length, 
            wasEdited: true,
            frameworkContent: truncateText(JSON.stringify(updatedScenario))
          },
          logger.getCaseId(true)
        ).catch(err => console.error(`Error logging scenario update for ${updatedScenario.id}:`, err));
      }

      console.log(`Scenario ${updatedScenario.id} updated successfully`);
    } catch (error) {
      console.error("Error updating scenario:", error);
      setError("Failed to update scenario description. Please try again.");
    }
  };

  // Render the issue selection panel
  const renderIssueSelectionPanel = () => {
    if (!currentCase || !currentCase.analysis) return null;
    
    return (
      <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main', mb: 1 }}>
            Select Issue
          </Typography>
          
          <Button
            variant="outlined"
            color="warning"
            onClick={handleOpenConfirmDialog}
            disabled={isGeneratingAll || isAnyIssueGenerating()}
            startIcon={isGeneratingAll ? <CircularProgress size={16} /> : <RefreshIcon />}
            size="small"
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'medium',
              mb: 2,
              width: '100%',
            }}
          >
            {isGeneratingAll ? 'Generating All...' : 'Regenerate All'}
          </Button>
          
          <Divider sx={{ mb: 2 }} />
          <List component="nav" aria-label="issue selection" sx={{ px: 0 }}>
            {currentCase.analysis.components.map((component) => {
              // Check if this component has scenarios
              const hasScenarios = currentCase.scenarios.some(s => s.componentId === component.id);
              
              // Check if scenarios are loaded for this component
              const scenariosLoaded = loadedScenarios.some(id => {
                const scenario = currentCase.scenarios.find(s => s.id === id);
                return scenario?.componentId === component.id;
              });
              
              // Check if this component is currently being generated
              const isCurrentlyGenerating = isGeneratingIssue(component.id);
              
              return (
                <ListItemButton
                  key={component.id}
                  selected={selectedIssueId === component.id}
                  onClick={() => handleIssueChange(component.id)}
                  sx={{
                    borderLeft: selectedIssueId === component.id 
                      ? '4px solid #1976d2' 
                      : '4px solid transparent',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: hasScenarios ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
                    '&:hover': {
                      bgcolor: hasScenarios ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(25, 118, 210, 0.12)',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.18)',
                      },
                    },
                  }}
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {component.name}
                        {isCurrentlyGenerating && (
                          <CircularProgress size={14} sx={{ ml: 1 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      isCurrentlyGenerating 
                        ? "Scenarios generating..." 
                        : hasScenarios 
                          ? scenariosLoaded 
                            ? "Scenarios loaded" 
                            : "Scenarios need loading"
                          : "No scenarios yet"
                    }
                    primaryTypographyProps={{
                      fontWeight: selectedIssueId === component.id ? 'bold' : 'medium',
                      fontSize: '0.95rem',
                    }}
                    secondaryTypographyProps={{
                      color: isCurrentlyGenerating
                        ? 'warning.main'
                        : hasScenarios 
                          ? scenariosLoaded ? 'success.main' : 'warning.main'
                          : 'text.secondary',
                      fontSize: '0.8rem',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </CardContent>
      </Card>
    );
  };

  // Main Render
  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
          Negotiation Scenarios
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert
            sx={{ mt: 2, mb: 3, borderRadius: 1 }}
            severity={typeof error === 'string' && error.includes('successfully') ? 'success' : 'error'}
            onClose={() => setError(null)}
            variant="filled"
          >
            {error}
          </Alert>
        )}
        
        {isGeneratingAll && (
          <Alert 
            severity="info" 
            sx={{ mb: 3, borderRadius: 1 }}
            variant="filled"
          >
            Generating scenarios for all issues... This may take a moment.
          </Alert>
        )}
        
        {needsRecalculation && (
          <RecalculationWarning
            message="The analysis has been modified. The scenarios may not reflect the latest changes."
            onRecalculate={handleGenerateScenarios}
          />
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {renderIssueSelectionPanel()}
          </Grid>
          
          <Grid item xs={12} md={9}>
            {selectedIssueId ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: 'text.primary', mb: 1 }}>
                    {selectedIssue?.name} Scenarios
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.9rem' }}>
                    Click on a scenario to select it. Click the edit icon to modify a scenario's description.
                  </Typography>
                  
                  <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGenerateScenarios}
                      disabled={isAnyIssueGenerating()}
                      startIcon={isAnyIssueGenerating() ? <CircularProgress size={16} /> : null}
                      size="medium"
                      sx={{ 
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 'medium',
                        boxShadow: 2
                      }}
                    >
                      {getRegenerateButtonText()}
                    </Button>
                    
                    {isAnyIssueGenerating() && !isGeneratingIssue(selectedIssueId) && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem', maxWidth: 250, textAlign: 'right' }}>
                        Cannot generate while other issues are being processed
                      </Typography>
                    )}
                  </Box>
                  
                  <ScenarioSpectrum
                    scenarios={filteredScenarios}
                    party1Name={party1Name}
                    party2Name={party2Name}
                    onSelectScenario={handleSelectScenario}
                    onUpdateScenario={handleUpdateScenario}
                    selectedScenarioId={selectedScenario?.id}
                    loadedScenarios={loadedScenarios}
                  />
                </Box>
              </>
            ) : (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Select an issue from the list to view its scenarios
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: { 
            borderTop: '4px solid #f44336',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <span>Warning: Regenerate All Scenarios?</span>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will <strong>remove all existing scenarios</strong> and regenerate them from scratch. 
            Any customizations or edits you've made will be permanently lost.
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', color: 'error.main', borderRadius: 1, border: '1px solid currentColor' }}>
              This action cannot be undone.
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary" variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={executeRegenerateAll} 
            color="error" 
            variant="contained" 
            startIcon={<RefreshIcon />}
            autoFocus
          >
            Regenerate All
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NegotiationScenario; 