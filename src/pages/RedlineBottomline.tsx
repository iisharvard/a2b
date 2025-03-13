import { useState, useEffect, useCallback } from 'react';
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
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  IconButton,
  Collapse,
  TextField,
  Card,
  CardContent,
  Tabs,
  Tab,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  CircularProgress,
  Stack,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import ReorderIcon from '@mui/icons-material/Reorder';
import DownloadIcon from '@mui/icons-material/Download';
import { RootState } from '../store';
import { 
  updateComponents, 
  updateIoA, 
  updateIceberg, 
  updateComponent, 
  Component
} from '../store/negotiationSlice';
import { setAnalysisRecalculated, setScenariosRecalculated } from '../store/recalculationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import NegotiationIssueCard from '../components/NegotiationIssueCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RecalculationWarning from '../components/RecalculationWarning';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Add a11yProps function
function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

const RedlineBottomline = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentCase } = useSelector((state: RootState) => state.negotiation);
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [componentOrder, setComponentOrder] = useState<string[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);

  // Get party names for display
  const party1Name = currentCase?.suggestedParties[0]?.name || 'Party 1';
  const party2Name = currentCase?.suggestedParties[1]?.name || 'Party 2';

  useEffect(() => {
    if (!currentCase) {
      navigate('/');
      return;
    }
    
    if (!currentCase.analysis) {
      navigate('/review');
      return;
    }
    
    // Initialize component order from priorities
    const sortedComponents = [...currentCase.analysis.components].sort((a, b) => a.priority - b.priority);
    setComponentOrder(sortedComponents.map(c => c.id));
    
    // Initialize selected components with all component IDs
    setSelectedComponents(currentCase.analysis.components.map(c => c.id));
  }, [currentCase, navigate]);

  useEffect(() => {
    if (currentCase?.analysis?.components) {
      // Initialize selected components with all component IDs
      setSelectedComponents(currentCase.analysis.components.map(c => c.id));
      
      // Set the first component as selected by default if none is selected
      if (!selectedComponentId && currentCase.analysis.components.length > 0) {
        setSelectedComponentId(currentCase.analysis.components[0].id);
      }
    }
  }, [currentCase?.analysis?.components, selectedComponentId]);

  const handleComponentChange = useCallback((updatedComponent: Component) => {
    if (!currentCase?.analysis) return;
    
    const updatedComponents = currentCase.analysis.components.map((component) =>
      component.id === updatedComponent.id ? updatedComponent : component
    );
    
    dispatch(updateComponents(updatedComponents));
  }, [currentCase, dispatch]);

  const handleNext = useCallback(() => {
    navigate('/scenarios');
  }, [navigate]);

  const handleComponentSelect = useCallback((componentId: string) => {
    setSelectedComponents(prev => {
      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  }, []);

  const moveComponentUp = useCallback((index: number) => {
    if (index <= 0 || !currentCase?.analysis?.components) return;
    
    // Create a deep copy of the components array
    const components = JSON.parse(JSON.stringify(currentCase.analysis.components));
    
    // Swap the components
    const temp = components[index];
    components[index] = components[index - 1];
    components[index - 1] = temp;
    
    // Update the priorities
    components.forEach((comp: Component, idx: number) => {
      comp.priority = idx;
    });
    
    // Update the component order
    const newOrder = components.map((comp: Component) => comp.id);
    setComponentOrder(newOrder);
    
    // Update Redux
    dispatch(updateComponents(components));
    
    // If the selected component was moved, update the selection
    if (selectedComponentId === components[index - 1].id) {
      setSelectedComponentId(components[index - 1].id);
    }
  }, [currentCase, dispatch, selectedComponentId]);

  const moveComponentDown = useCallback((index: number) => {
    if (!currentCase?.analysis?.components) return;
    if (index >= currentCase.analysis.components.length - 1) return;
    
    // Create a deep copy of the components array
    const components = JSON.parse(JSON.stringify(currentCase.analysis.components));
    
    // Swap the components
    const temp = components[index];
    components[index] = components[index + 1];
    components[index + 1] = temp;
    
    // Update the priorities
    components.forEach((comp: Component, idx: number) => {
      comp.priority = idx;
    });
    
    // Update the component order
    const newOrder = components.map((comp: Component) => comp.id);
    setComponentOrder(newOrder);
    
    // Update Redux
    dispatch(updateComponents(components));
    
    // If the selected component was moved, update the selection
    if (selectedComponentId === components[index + 1].id) {
      setSelectedComponentId(components[index + 1].id);
    }
  }, [currentCase, dispatch, selectedComponentId]);

  const handleReorderComponent = useCallback((componentId: string, newPosition: number) => {
    if (!currentCase?.analysis?.components) return;
    
    const currentIndex = componentOrder.findIndex(id => id === componentId);
    if (currentIndex === -1 || newPosition === currentIndex) return;
    
    const newOrder = [...componentOrder];
    newOrder.splice(currentIndex, 1);
    newOrder.splice(newPosition, 0, componentId);
    setComponentOrder(newOrder);
    
    // Update priorities in Redux
    const updatedComponents = currentCase.analysis.components.map(component => {
      const newIndex = newOrder.findIndex(id => id === component.id);
      return {
        ...component,
        priority: newIndex
      };
    });
    
    dispatch(updateComponents(updatedComponents));
  }, [currentCase, componentOrder, dispatch]);

  // Function to handle recalculation of analysis
  const handleRecalculateAnalysis = useCallback(async () => {
    if (!currentCase) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Recalculate boundaries using the API
      const updatedComponents = await api.recalculateBoundaries(currentCase.analysis!);
      
      // Update Redux store with new components
      dispatch(updateComponents(updatedComponents));
      
      // Mark analysis as recalculated and scenarios as needing recalculation
      dispatch(setAnalysisRecalculated(true));
      dispatch(setScenariosRecalculated(false));
      
      // Show success message
      setError('Analysis has been successfully recalculated. Scenarios will be regenerated.');
      
      return updatedComponents;
    } catch (err) {
      console.error('Error recalculating analysis:', err);
      setError('Failed to recalculate analysis. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCase, dispatch]);

  const handleReanalyze = useCallback(async () => {
    if (!currentCase || !currentCase.suggestedParties.length) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const analysisResult = await api.analyzeCase(
        currentCase.content,
        currentCase.suggestedParties[0],
        currentCase.suggestedParties[1]
      );
      
      if ('rateLimited' in analysisResult) {
        setError('Rate limit reached. Please try again in a few moments.');
        return;
      }
      
      dispatch(updateComponents(analysisResult.components));
      dispatch(updateIoA(analysisResult.ioa));
      dispatch(updateIceberg(analysisResult.iceberg));
      dispatch(setAnalysisRecalculated(true));
      setError('Analysis has been successfully recalculated.');
    } catch (err) {
      console.error('Error reanalyzing case:', err);
      setError('Failed to recalculate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentCase, dispatch]);

  const handleDownloadContent = useCallback(() => {
    if (!currentCase || !currentCase.analysis) return;

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const content = `NEGOTIATION ANALYSIS REPORT
Generated on: ${formatDate(new Date().toISOString())}
=======================================================

CASE CONTENT
-----------
${currentCase.content}

PARTIES INVOLVED
---------------
1. ${currentCase.suggestedParties[0].name}
   ${currentCase.suggestedParties[0].description}

2. ${currentCase.suggestedParties[1].name}
   ${currentCase.suggestedParties[1].description}

ISLAND OF AGREEMENTS ANALYSIS
---------------------------
${currentCase.analysis.ioa}

ICEBERG ANALYSIS
---------------
${currentCase.analysis.iceberg}

NEGOTIATION COMPONENTS
--------------------
${currentCase.analysis.components.map((comp, index) => `
${index + 1}. ${comp.name.toUpperCase()}
   Priority: ${comp.priority}
   Description: ${comp.description}

   ${currentCase.suggestedParties[0].name}'s Position:
   - Redline (Non-negotiable): ${comp.redlineParty1}
   - Bottomline (Minimum acceptable): ${comp.bottomlineParty1}

   ${currentCase.suggestedParties[1].name}'s Position:
   - Redline (Non-negotiable): ${comp.redlineParty2}
   - Bottomline (Minimum acceptable): ${comp.bottomlineParty2}
`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `negotiation-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentCase]);

  if (!currentCase || !currentCase.analysis) {
    return null; // Will redirect in useEffect
  }

  // Get components in the current order
  const orderedComponents = componentOrder
    .map(id => currentCase.analysis?.components.find(comp => comp.id === id))
    .filter(Boolean) as Component[];

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Redlines and Bottomlines
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {!recalculationStatus.analysisRecalculated && (
          <RecalculationWarning
            message="The analysis has been modified. You may want to recalculate the boundaries."
            onRecalculate={handleRecalculateAnalysis}
          />
        )}
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleDownloadContent}
            startIcon={<DownloadIcon />}
            sx={{ fontSize: '0.8rem' }}
            size="small"
          >
            Download Analysis
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleReanalyze}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{ fontSize: '0.8rem' }}
            size="small"
          >
            Reevaluate Analysis
          </Button>
        </Box>

        {loading && <LoadingOverlay open={loading} message="Analyzing..." />}
        
        <Grid container spacing={3}>
          {/* Left panel for component selection and ordering */}
          <Grid item xs={12} md={4} sx={{ flexGrow: 1 }}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Negotiation Issues
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select and prioritize key issues to be negotiated
              </Typography>
              
              <List dense sx={{ bgcolor: 'background.paper', border: '1px solid #eee', borderRadius: 1 }}>
                {currentCase.analysis.components.map((component, index) => (
                  <ListItem 
                    key={component.id}
                    sx={{ 
                      borderBottom: index < (currentCase.analysis?.components.length || 0) - 1 ? '1px solid #eee' : 'none',
                      bgcolor: selectedComponentId === component.id ? 'action.selected' : 'inherit',
                      py: 1,
                      pr: 8
                    }}
                    button
                    onClick={() => setSelectedComponentId(component.id)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.includes(component.id)}
                        onChange={() => handleComponentSelect(component.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                      />
                    </ListItemIcon>
                    <Tooltip title={component.name} placement="top" arrow>
                      <ListItemText 
                        primary={component.name} 
                        primaryTypographyProps={{ 
                          variant: 'body2',
                          fontWeight: selectedComponentId === component.id ? 'bold' : 'normal',
                          sx: { 
                            minWidth: '200px',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            lineHeight: 1.4
                          }
                        }}
                      />
                    </Tooltip>
                    <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton 
                        edge="end" 
                        aria-label="move up"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveComponentUp(index);
                        }}
                        disabled={index === 0}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="move down"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveComponentDown(index);
                        }}
                        disabled={index === (currentCase.analysis?.components.length || 0) - 1}
                        size="small"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* Right panel for component details and RL/BL */}
          <Grid item xs={12} md={8}>
            {selectedComponentId ? (
              currentCase?.analysis?.components
                .filter(component => component.id === selectedComponentId)
                .map((component) => (
                  <Paper key={component.id} elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {component.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {component.description}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Party 1 Boundaries */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
                        {party1Name} Boundaries
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Redline (Non-negotiable)
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={component.redlineParty1}
                            onChange={(e) => handleComponentChange({
                              ...component,
                              redlineParty1: e.target.value
                            })}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Bottomline (Minimum acceptable)
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={component.bottomlineParty1}
                            onChange={(e) => handleComponentChange({
                              ...component,
                              bottomlineParty1: e.target.value
                            })}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {/* Party 2 Boundaries */}
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 1, color: 'secondary.main', fontWeight: 'bold' }}>
                        {party2Name} Boundaries
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Redline (Non-negotiable)
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={component.redlineParty2}
                            onChange={(e) => handleComponentChange({
                              ...component,
                              redlineParty2: e.target.value
                            })}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Bottomline (Minimum acceptable)
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={component.bottomlineParty2}
                            onChange={(e) => handleComponentChange({
                              ...component,
                              bottomlineParty2: e.target.value
                            })}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                ))
            ) : (
              <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="body1" color="text.secondary">
                  Select a component from the list to view and edit its boundaries
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            size="large"
          >
            Next: Scenarios
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RedlineBottomline; 