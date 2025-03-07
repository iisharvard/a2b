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
import { RootState } from '../store';
import { updateComponents, updateIoA, updateIceberg, updateComponent, setCaseContent, Component } from '../store/negotiationSlice';
import { api } from '../services/api';
import LoadingOverlay from '../components/LoadingOverlay';
import NegotiationIssueCard from '../components/NegotiationIssueCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [componentOrder, setComponentOrder] = useState<string[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');

  // Get party names for display
  const party1Name = currentCase?.party1?.name || 'Party 1';
  const party2Name = currentCase?.party2?.name || 'Party 2';

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

  const handleComponentChange = (updatedComponent: any) => {
    if (!currentCase?.analysis) return;
    
    const updatedComponents = currentCase.analysis.components.map((component) =>
      component.id === updatedComponent.id ? updatedComponent : component
    );
    
    dispatch(updateComponents(updatedComponents));
  };

  const handleNext = () => {
    navigate('/scenarios');
  };

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponents(prev => {
      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  };

  const moveComponentUp = (index: number) => {
    if (index <= 0) return;
    
    // Get the current components
    if (!currentCase?.analysis?.components) return;
    
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
  };

  const moveComponentDown = (index: number) => {
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
  };

  const handleReorderComponent = (componentId: string, newPosition: number) => {
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
  };

  if (!currentCase || !currentCase.analysis) {
    return null; // Will redirect in useEffect
  }

  // Get components in the current order
  const orderedComponents = componentOrder
    .map(id => currentCase.analysis?.components.find(comp => comp.id === id))
    .filter(Boolean);

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Redlines & Bottomlines
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
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
                {currentCase?.analysis?.components.map((component, index) => (
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
                        {currentCase.party1.name} Boundaries
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
                        {currentCase.party2.name} Boundaries
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