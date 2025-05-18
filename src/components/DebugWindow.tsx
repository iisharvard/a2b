import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Tab, 
  Tabs, 
  TextField, 
  Typography, 
  Paper,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import PreviewIcon from '@mui/icons-material/Preview';
import { RootState } from '../store';
import { 
  changeIoA, 
  changeIceberg, 
  changeComponents, 
  changeBoundaries, 
  changeScenarios 
} from '../services/api/contentChanges';
import { Scenario, Component } from '../store/negotiationSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Component to manage tab panels
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Sample valid data for each content type
const SAMPLE_DATA = {
  ioa: `# Island of Agreements

## Contested Facts
- The exact timeline for implementing the new healthcare protocol
- The number of medical staff required for the operation
- The extent of military protection needed for medical facilities

## Agreed Facts
- Both parties acknowledge the humanitarian crisis in the region
- Medical aid is urgently needed in multiple locations
- A coordination mechanism between organizations is necessary

## Convergent Norms
- Protection of civilian lives is a priority
- Medical neutrality should be respected
- Transparent communication between parties is essential

## Divergent Norms
- Views on military involvement in humanitarian operations
- Positions on local government involvement and oversight
- Perspectives on prioritization of different affected areas`,

  iceberg: `# Iceberg Analysis

## Party 1 (User's Organization)

### Position (What)
- Needs immediate access to all affected areas
- Requires freedom to operate independently
- Wants to bring in international medical staff

### Reasoning (How)
- Past experiences show independence increases effectiveness
- International staff has specialized expertise
- Quick response will prevent the crisis from worsening

### Motives (Why)
- Humanitarian principles of neutrality and impartiality
- Professional excellence in emergency response
- International solidarity in crisis situations

## Party 2 (Counterparty)

### Position (What)
- Must maintain security oversight in all areas
- Requires coordination through local authorities
- Prefers utilizing local medical professionals

### Reasoning (How)
- Security threats require careful monitoring
- Local knowledge improves effectiveness of response
- Building local capacity creates sustainable solutions

### Motives (Why)
- National sovereignty and territorial integrity
- Self-sufficiency and local empowerment
- Responsible governance during crisis`,

  components: `## Medical Access Protocol

Establishing protocols for humanitarian medical teams to access affected areas while addressing security concerns.

## Supply Chain Logistics

Developing efficient and secure supply chains for medical equipment and medications.

## Staff Composition

Determining the appropriate balance between international and local medical personnel.`,

  boundaries: [
    {
      id: "comp-1",
      name: "Medical Access Protocol",
      description: "Establishing protocols for humanitarian medical teams to access affected areas while addressing security concerns.",
      redlineParty1: "Must have unrestricted access to all affected areas within 24 hours of request.",
      bottomlineParty1: "Access to critical areas within 48 hours with simplified clearance process.",
      redlineParty2: "All humanitarian teams must register and coordinate through the central security office.",
      bottomlineParty2: "Expedited clearance process with 24-hour advance notice for most areas.",
      priority: 1
    },
    {
      id: "comp-2",
      name: "Supply Chain Logistics",
      description: "Developing efficient and secure supply chains for medical equipment and medications.",
      redlineParty1: "No inspection processes that delay critical supplies by more than 6 hours.",
      bottomlineParty1: "Streamlined inspection at major checkpoints only.",
      redlineParty2: "All incoming supplies must be documented and subject to inspection.",
      bottomlineParty2: "Fast-track inspection for critical supplies with proper documentation.",
      priority: 2
    }
  ],

  scenarios: [
    {
      id: "scen-1",
      componentId: "comp-1",
      type: "agreement_area",
      description: "Humanitarian teams submit access requests 24 hours in advance through an expedited digital platform. Critical areas receive automatic approval with security briefing. Non-critical areas receive approval within 48 hours."
    },
    {
      id: "scen-2",
      componentId: "comp-1",
      type: "redline_violated_p1",
      description: "Government requires all humanitarian access requests to undergo full security clearance taking 72-96 hours, with possible rejection for certain areas deemed too sensitive."
    },
    {
      id: "scen-3",
      componentId: "comp-1",
      type: "redline_violated_p2",
      description: "Humanitarian organization declares they will enter all areas without prior notification or registration, citing extreme emergency conditions."
    }
  ]
};

const DebugWindow: React.FC = () => {
  // State for dialog and tabs
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Current analysis data from Redux
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);
  const analysis = currentCase?.analysis;
  
  // State for each content type
  const [ioaContent, setIoaContent] = useState<string>('');
  const [icebergContent, setIcebergContent] = useState<string>('');
  const [componentsContent, setComponentsContent] = useState<string>('');
  const [boundariesContent, setBoundariesContent] = useState<string>('');
  const [scenariosContent, setScenariosContent] = useState<string>('');
  
  // Update local state when Redux data changes
  useEffect(() => {
    if (analysis) {
      setIoaContent(analysis.ioa || '');
      setIcebergContent(analysis.iceberg || '');
      setComponentsContent(JSON.stringify(analysis.components, null, 2) || '');
      setBoundariesContent(JSON.stringify(analysis.components, null, 2) || '');
      setScenariosContent(JSON.stringify(currentCase?.scenarios || [], null, 2) || '');
    }
  }, [analysis, currentCase?.scenarios]);
  
  /*
  // Handler for keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+I (Mac) or Control+I (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  */
  
  // Load example data based on current tab
  const loadExampleData = () => {
    switch (tabValue) {
      case 0: // IoA
        setIoaContent(SAMPLE_DATA.ioa);
        break;
      case 1: // Iceberg
        // Check if there's an existing format in the current case
        if (currentCase?.analysis?.iceberg && currentCase.analysis.iceberg.trim()) {
          // Use the existing format as a reference
          setIcebergContent(currentCase.analysis.iceberg);
          setNotification({ message: 'Loaded current iceberg format from case', type: 'success' });
        } else {
          // Use the sample data
          setIcebergContent(SAMPLE_DATA.iceberg);
          setNotification({ message: 'Loaded example iceberg data', type: 'success' });
        }
        break;
      case 2: // Components
        setComponentsContent(SAMPLE_DATA.components);
        break;
      case 3: // Boundaries
        setBoundariesContent(JSON.stringify(SAMPLE_DATA.boundaries, null, 2));
        break;
      case 4: // Scenarios
        setScenariosContent(JSON.stringify(SAMPLE_DATA.scenarios, null, 2));
        break;
      default:
        break;
    }
    if (tabValue !== 1) {
      setNotification({ message: 'Example data loaded', type: 'success' });
    }
  };
  
  // Handlers for tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Handlers for content updates
  const handleUpdateIoA = async () => {
    try {
      const result = await changeIoA(ioaContent) as any;
      if (result.success) {
        setNotification({ message: 'IoA updated successfully', type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    }
  };
  
  const handleUpdateIceberg = async () => {
    try {
      const result = await changeIceberg(icebergContent) as any;
      if (result.success) {
        setNotification({ message: 'Iceberg updated successfully', type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    }
  };
  
  const handleUpdateComponents = async () => {
    try {
      const result = await changeComponents(componentsContent) as any;
      if (result.success) {
        setNotification({ message: 'Components updated successfully', type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    }
  };
  
  const handleUpdateBoundaries = async () => {
    try {
      // Parse the JSON string to get the components array
      const boundaries = JSON.parse(boundariesContent) as Component[];
      const result = await changeBoundaries(boundaries) as any;
      if (result.success) {
        setNotification({ message: 'Boundaries updated successfully', type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: `Error: ${error instanceof Error ? error.message : 'JSON parsing error or unknown error'}`, 
        type: 'error' 
      });
    }
  };
  
  const handleUpdateScenarios = async () => {
    try {
      // Parse the JSON string to get the scenarios array
      const scenarios = JSON.parse(scenariosContent) as Scenario[];
      const result = await changeScenarios(scenarios) as any;
      if (result.success) {
        setNotification({ message: 'Scenarios updated successfully', type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: `Error: ${error instanceof Error ? error.message : 'JSON parsing error or unknown error'}`, 
        type: 'error' 
      });
    }
  };
  
  // Toggle the debug window
  const toggleDebugWindow = () => {
    setOpen(prev => !prev);
  };
  
  return (
    <>
      {/* Floating button in the bottom-right corner */}
      {/*
      <Box 
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          zIndex: 9999 
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: '50%', 
            width: 48, 
            height: 48, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={toggleDebugWindow}
        >
          <CodeIcon />
        </Paper>
      </Box>
      */}
    
      {/* Debug Dialog */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { 
            minHeight: '80vh',
            maxHeight: '80vh',
            position: 'fixed',
            bottom: 50,
            m: 2,
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>
          Content Debug Window
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="IoA" />
            <Tab label="Iceberg" />
            <Tab label="Components" />
            <Tab label="Boundaries" />
            <Tab label="Scenarios" />
          </Tabs>
        </Box>
        
        <DialogContent sx={{ height: '100%' }}>
          {/* Load Example Data Button */}
          <Box sx={{ position: 'absolute', top: 16, right: 60, zIndex: 10 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<PreviewIcon />}
              onClick={loadExampleData}
            >
              Load Example
            </Button>
          </Box>
        
          {/* IoA Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="subtitle2" gutterBottom>
              Island of Agreement Content
            </Typography>
            <TextField
              multiline
              rows={15}
              fullWidth
              variant="outlined"
              value={ioaContent}
              onChange={(e) => setIoaContent(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateIoA}
              >
                Update IoA
              </Button>
            </Box>
          </TabPanel>
          
          {/* Iceberg Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="subtitle2" gutterBottom>
              Iceberg Analysis Content
            </Typography>
            <TextField
              multiline
              rows={15}
              fullWidth
              variant="outlined"
              value={icebergContent}
              onChange={(e) => setIcebergContent(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateIceberg}
              >
                Update Iceberg
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  try {
                    // Check for Party 1 and Party 2 in various formats (plain text or markdown headers)
                    const party1Pattern = /(?:^|\n)(?:## )?(?:Party 1|.*Organization|.*User.*|.*Your.*|.*We.*)/;
                    const party2Pattern = /(?:^|\n)(?:## )?(?:Party 2|.*Counter.*|.*They.*|.*Them.*)/;
                    
                    // Check if the content has required sections in various formats
                    const positionPatterns = [/Position(?:s)?/, /What/];
                    const reasoningPatterns = [/Reasoning/, /How/];
                    const valuesPatterns = [/Value(?:s)?/, /Motive(?:s)?/, /Why/];
                    
                    const hasParty1 = party1Pattern.test(icebergContent);
                    const hasParty2 = party2Pattern.test(icebergContent);
                    const hasPositions = positionPatterns.some(pattern => pattern.test(icebergContent));
                    const hasReasoning = reasoningPatterns.some(pattern => pattern.test(icebergContent));
                    const hasValues = valuesPatterns.some(pattern => pattern.test(icebergContent));
                    const hasBulletPoints = icebergContent.includes('- ');
                    
                    const missingSections = [];
                    if (!hasPositions) missingSections.push('Positions/What');
                    if (!hasReasoning) missingSections.push('Reasoning/How');
                    if (!hasValues) missingSections.push('Values/Motives/Why');
                    
                    let message = '';
                    
                    if (!hasParty1 || !hasParty2) {
                      message += 'Content must include sections for Party 1 and Party 2. ';
                    }
                    
                    if (missingSections.length > 0) {
                      message += `Missing required sections: ${missingSections.join(', ')}`;
                    }
                    
                    if (!hasBulletPoints) {
                      message += (message ? ' ' : '') + 'Content must include bullet points (- ) for entries.';
                    }
                    
                    if (message) {
                      setNotification({ message, type: 'error' });
                    } else {
                      setNotification({ message: 'Iceberg format is valid', type: 'success' });
                    }
                  } catch (error) {
                    setNotification({ 
                      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
                      type: 'error' 
                    });
                  }
                }}
              >
                Validate Format
              </Button>
            </Box>
          </TabPanel>
          
          {/* Components Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="subtitle2" gutterBottom>
              Components Content (Markdown Format)
            </Typography>
            <TextField
              multiline
              rows={15}
              fullWidth
              variant="outlined"
              value={componentsContent}
              onChange={(e) => setComponentsContent(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
              placeholder="## Component 1&#10;&#10;Description for component 1&#10;&#10;## Component 2&#10;&#10;Description for component 2"
            />
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateComponents}
              >
                Update Components
              </Button>
            </Box>
          </TabPanel>
          
          {/* Boundaries Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="subtitle2" gutterBottom>
              Boundaries Content (JSON Format)
            </Typography>
            <TextField
              multiline
              rows={15}
              fullWidth
              variant="outlined"
              value={boundariesContent}
              onChange={(e) => setBoundariesContent(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateBoundaries}
              >
                Update Boundaries
              </Button>
            </Box>
          </TabPanel>
          
          {/* Scenarios Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="subtitle2" gutterBottom>
              Scenarios Content (JSON Format)
            </Typography>
            <TextField
              multiline
              rows={15}
              fullWidth
              variant="outlined"
              value={scenariosContent}
              onChange={(e) => setScenariosContent(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateScenarios}
              >
                Update Scenarios
              </Button>
            </Box>
          </TabPanel>
        </DialogContent>
      </Dialog>
      
      {/* Notification */}
      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification?.type || 'info'} 
          sx={{ width: '100%' }}
        >
          {notification?.message || ''}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DebugWindow; 