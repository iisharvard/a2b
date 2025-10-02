import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
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
import { validateIcebergContent } from '../utils/contentValidation';

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

type TabKey = 'ioa' | 'iceberg' | 'components' | 'boundaries' | 'scenarios';

interface TabConfig {
  key: TabKey;
  label: string;
  description: string;
  updateLabel: string;
  sample: string | (() => string);
  update: (value: unknown) => { success: boolean; message: string } | { rateLimited: true };
  parse?: (value: string) => unknown;
}

const DebugWindow: React.FC = () => {
  // State for dialog and tabs
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Current analysis data from Redux
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);
  const analysis = currentCase?.analysis;

  const [tabContents, setTabContents] = useState<Record<TabKey, string>>({
    ioa: '',
    iceberg: '',
    components: '',
    boundaries: '',
    scenarios: '',
  });

  const tabConfigs = useMemo<TabConfig[]>(() => ([
    {
      key: 'ioa',
      label: 'IoA',
      description: 'Island of Agreement Content',
      updateLabel: 'Update IoA',
      sample: SAMPLE_DATA.ioa,
      update: (value: unknown) => changeIoA(value as string) as { success: boolean; message: string },
    },
    {
      key: 'iceberg',
      label: 'Iceberg',
      description: 'Iceberg Analysis Content',
      updateLabel: 'Update Iceberg',
      sample: () => {
        if (currentCase?.analysis?.iceberg && currentCase.analysis.iceberg.trim()) {
          return currentCase.analysis.iceberg;
        }
        return SAMPLE_DATA.iceberg;
      },
      update: (value: unknown) => changeIceberg(value as string) as { success: boolean; message: string },
    },
    {
      key: 'components',
      label: 'Components',
      description: 'Components Content (Markdown Format)',
      updateLabel: 'Update Components',
      sample: SAMPLE_DATA.components,
      update: (value: unknown) => changeComponents(value as string) as { success: boolean; message: string },
    },
    {
      key: 'boundaries',
      label: 'Boundaries',
      description: 'Boundaries Content (JSON Format)',
      updateLabel: 'Update Boundaries',
      sample: () => JSON.stringify(SAMPLE_DATA.boundaries, null, 2),
      parse: (value: string) => JSON.parse(value) as Component[],
      update: (value: unknown) => changeBoundaries(value as Component[]) as { success: boolean; message: string },
    },
    {
      key: 'scenarios',
      label: 'Scenarios',
      description: 'Scenarios Content (JSON Format)',
      updateLabel: 'Update Scenarios',
      sample: () => JSON.stringify(SAMPLE_DATA.scenarios, null, 2),
      parse: (value: string) => JSON.parse(value) as Scenario[],
      update: (value: unknown) => changeScenarios(value as Scenario[]) as { success: boolean; message: string },
    },
  ]), [currentCase?.analysis?.iceberg]);

  const configByKey = useMemo(() => {
    const map = {} as Record<TabKey, TabConfig>;
    tabConfigs.forEach((config) => {
      map[config.key] = config;
    });
    return map;
  }, [tabConfigs]);

  // Update local state when Redux data changes
  useEffect(() => {
    if (!analysis) {
      setTabContents({ ioa: '', iceberg: '', components: '', boundaries: '', scenarios: '' });
      return;
    }

    setTabContents({
      ioa: analysis.ioa || '',
      iceberg: analysis.iceberg || '',
      components: JSON.stringify(analysis.components, null, 2) || '',
      boundaries: JSON.stringify(analysis.components, null, 2) || '',
      scenarios: JSON.stringify(currentCase?.scenarios || [], null, 2) || '',
    });
  }, [analysis, currentCase?.scenarios]);

  // Load example data based on current tab
  const loadExampleData = () => {
    const config = tabConfigs[tabValue];
    if (!config) {
      return;
    }

    const example = typeof config.sample === 'function' ? config.sample() : config.sample;
    setTabContents(prev => ({
      ...prev,
      [config.key]: example,
    }));

    if (config.key === 'iceberg' && currentCase?.analysis?.iceberg && currentCase.analysis.iceberg.trim()) {
      setNotification({ message: 'Loaded current iceberg format from case', type: 'success' });
    } else {
      setNotification({ message: 'Example data loaded', type: 'success' });
    }
  };

  // Handlers for tab changes
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleUpdate = (key: TabKey) => {
    const config = configByKey[key];
    if (!config) {
      return;
    }

    try {
      const value = tabContents[key];
      const payload = config.parse ? config.parse(value) : value;
      const result = config.update(payload);

      if ('rateLimited' in result) {
        setNotification({ message: 'Request was rate limited. Please try again later.', type: 'error' });
        return;
      }

      if (result.success) {
        setNotification({ message: result.message, type: 'success' });
      } else {
        setNotification({ message: result.message, type: 'error' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const prefix = key === 'boundaries' || key === 'scenarios' ? 'JSON parsing error' : 'Error';
      setNotification({
        message: `${prefix}: ${message}`,
        type: 'error'
      });
    }
  };

  const handleValidateIceberg = () => {
    const validationMessage = validateIcebergContent(tabContents.iceberg);
    if (validationMessage) {
      setNotification({ message: validationMessage, type: 'error' });
    } else {
      setNotification({ message: 'Iceberg format is valid', type: 'success' });
    }
  };

  // Toggle the debug window
  const toggleDebugWindow = () => {
    setOpen(prev => !prev);
  };

  return (
    <>
      {/* Floating button in the bottom-right corner */}
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
            {tabConfigs.map((config) => (
              <Tab key={config.key} label={config.label} />
            ))}
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

          {tabConfigs.map((config, index) => (
            <TabPanel key={config.key} value={tabValue} index={index}>
              <Typography variant="subtitle2" gutterBottom>
                {config.description}
              </Typography>
              <TextField
                multiline
                rows={15}
                fullWidth
                variant="outlined"
                value={tabContents[config.key]}
                onChange={(e) => setTabContents(prev => ({
                  ...prev,
                  [config.key]: e.target.value,
                }))}
                sx={{ fontFamily: 'monospace' }}
                placeholder={config.key === 'components'
                  ? '## Component 1\n\nDescription for component 1\n\n## Component 2\n\nDescription for component 2'
                  : undefined}
              />
              <Box sx={{ mt: 2, display: 'flex', gap: config.key === 'iceberg' ? 2 : 0 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleUpdate(config.key)}
                >
                  {config.updateLabel}
                </Button>
                {config.key === 'iceberg' && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleValidateIceberg}
                  >
                    Validate Format
                  </Button>
                )}
              </Box>
            </TabPanel>
          ))}
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
