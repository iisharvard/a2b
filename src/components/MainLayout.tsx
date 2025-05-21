import { useState, useEffect } from 'react';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  AppBar,
  Toolbar,
  Tooltip,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BorderAllIcon from '@mui/icons-material/BorderAll';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LockIcon from '@mui/icons-material/Lock';
import SaveIcon from '@mui/icons-material/Save';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { RootState } from '../store';
import { clearState } from '../store/negotiationSlice';
import ExperimentalWarningDialog from './ExperimentalWarningDialog';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import ClearButtons from './ClearButtons';
import { useLogging } from '../contexts/LoggingContext';
import { clearInterfaceState, clearAllStorage } from '../utils/storage';

// Import all pages
import InitialSetup from '../pages/InitialSetup';
import ReviewAndRevise from '../pages/ReviewAndRevise';
import RedlineBottomline from '../pages/RedlineBottomline';
import NegotiationScenario from '../pages/NegotiationScenario';

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
      style={{ height: 'calc(100vh - 112px)', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

const MainLayout = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showWarning, setShowWarning] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, logout } = useFirebaseAuth();
  const { logger, isLoggingInitialized } = useLogging();
  
  const { currentCase } = useSelector(
    (state: RootState) => state.negotiation
  );

  // Set the active tab based on the current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setTabValue(0);
    else if (path === '/review') setTabValue(1);
    else if (path === '/boundaries') setTabValue(2);
    else if (path === '/scenarios') setTabValue(3);
  }, [location.pathname]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Check if the tab is ready to be navigated to
    if (isTabDisabled(newValue) || !isTabReady(newValue)) {
      return; // Prevent navigation
    }
    
    setTabValue(newValue);
    
    // Update the URL to maintain compatibility with existing code
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/review');
        break;
      case 2:
        navigate('/boundaries');
        break;
      case 3:
        navigate('/scenarios');
        break;
    }
  };

  // Determine if tabs should be disabled
  const isTabDisabled = (tabIndex: number) => {
    if (tabIndex === 0) return false; // First tab is always enabled
    if (!currentCase) return true;
    
    // For tabs that require analysis
    if (tabIndex >= 1 && (!currentCase || !currentCase.analysis)) return true;
    
    // For scenarios tab
    if (tabIndex === 3 && (!currentCase.analysis || !currentCase.analysis.components.length)) return true;
    
    return false;
  };

  // Determine if a tab is ready to be navigated to (has content)
  const isTabReady = (tabIndex: number) => {
    if (tabIndex === 0) return true; // First tab is always ready
    if (!currentCase) return false;
    
    switch (tabIndex) {
      case 1: // Analysis tab
        return !!currentCase.analysis;
      case 2: // Boundaries tab
        return !!currentCase.analysis && currentCase.analysis.components.length > 0;
      case 3: // Scenarios tab
        return !!currentCase.analysis && currentCase.analysis.components.length > 0;
      default:
        return false;
    }
  };

  // Get the status of a tab (complete, incomplete, locked)
  const getTabStatus = (tabIndex: number) => {
    if (!currentCase) return 'incomplete';
    
    switch (tabIndex) {
      case 0:
        return currentCase.content ? 'complete' : 'incomplete';
      case 1:
        return currentCase.analysis ? 'complete' : 'incomplete';
      case 2:
        return currentCase.analysis?.components.length ? 'complete' : 'incomplete';
      case 3:
        return currentCase.scenarios.length ? 'complete' : 'incomplete';
      default:
        return 'incomplete';
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login'); // Redirect to login after logout
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle error appropriately, maybe show a notification
    }
  };

  const handleClearInterface = () => {
    setClearConfirmOpen(true);
  };

  const confirmClearInterface = () => {
    // Log the action
    if (isLoggingInitialized && logger) {
      logger.logFramework(
        'Iceberg', // Placeholder for general app action
        'edit', 
        { /* metadata: { action_type: 'clear_interface_cache' } */ }, // Temporarily commenting out metadata
        'app_global'
      ).catch((err: any) => console.error('Error logging interface cache clear:', err));
    }
    
    // Clear both the local storage and the Redux store state
    clearInterfaceState();
    clearAllStorage();
    dispatch(clearState());
    
    console.log('Interface content cleared by user.');
    
    // Close the dialog
    setClearConfirmOpen(false);
    
    // Force a complete page reload to ensure all state is refreshed
    window.location.href = '/';
  };

  // Custom tab with enhanced visual indicators
  const CustomTab = ({ icon, label, index }: { icon: React.ReactNode, label: string, index: number }) => {
    const status = getTabStatus(index);
    const disabled = isTabDisabled(index);
    const ready = isTabReady(index);
    
    let tooltipTitle = "";
    if (disabled) {
      tooltipTitle = "Complete previous steps to unlock";
    } else if (!ready) {
      tooltipTitle = "Generate content in previous tab first";
    }
    
    const handleClick = () => {
      // Allow navigation to previous tabs even if current tab is disabled
      if (!disabled || index < tabValue) {
        switch (index) {
          case 0:
            navigate('/');
            break;
          case 1:
            navigate('/review');
            break;
          case 2:
            navigate('/boundaries');
            break;
          case 3:
            navigate('/scenarios');
            break;
        }
      }
    };
    
    return (
      <Tooltip 
        title={tooltipTitle} 
        arrow
      >
        <span onClick={handleClick} style={{ cursor: (!disabled || index < tabValue) ? 'pointer' : 'not-allowed' }}>
          <Tab
            icon={
              <Box sx={{ position: 'relative' }}>
                {React.cloneElement(icon as React.ReactElement, { 
                  sx: { 
                    fontSize: '1.2rem',
                    color: status === 'complete' ? 'primary.main' : 'inherit'
                  } 
                })}
                {disabled && (
                  <LockIcon 
                    sx={{ 
                      position: 'absolute', 
                      top: -6, 
                      right: -6, 
                      fontSize: '0.7rem',
                      color: 'text.disabled',
                      bgcolor: 'background.paper',
                      borderRadius: '50%'
                    }} 
                  />
                )}
              </Box>
            }
            label={label}
            {...a11yProps(index)}
            disabled={disabled || !ready}
            sx={{
              opacity: disabled || !ready ? 0.5 : 1,
              '&.Mui-disabled': {
                color: 'text.disabled',
              }
            }}
          />
        </span>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <ExperimentalWarningDialog
        open={showWarning}
        onClose={() => setShowWarning(false)}
      />
      <Dialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        aria-labelledby="clear-confirm-dialog-title"
      >
        <DialogTitle id="clear-confirm-dialog-title">
          Clear Application Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will clear all current work, including case content, analysis, and scenarios. All data will be permanently removed from the application. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmClearInterface} color="error" autoFocus>
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ minHeight: '48px' }}>
          <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1 }}>
            A2B Negotiation Assistant
          </Typography>
          <Box sx={{ mr: 2 }}>
            <ClearButtons 
              onClearInterface={handleClearInterface}
            />
          </Box>
          {currentCase && (
            <Tooltip title="Your work is automatically saved">
              <Chip
                icon={<SaveIcon fontSize="small" />}
                label="Auto-saved"
                size="small"
                color="success"
                variant="outlined"
                sx={{ mr: 1 }}
              />
            </Tooltip>
          )}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountCircleIcon sx={{ mr: 0.5, fontSize: '1.25rem', color: 'action.active' }} />
              <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
                {user.displayName || user.email}
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                size="small"
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="negotiation process tabs"
          sx={{ 
            minHeight: '48px',
            '& .MuiTab-root': {
              minHeight: '48px',
              py: 0.5,
              fontSize: '0.85rem'
            }
          }}
        >
          <CustomTab 
            icon={<DescriptionIcon sx={{ fontSize: '1.2rem' }} />} 
            label="Case & Parties" 
            index={0} 
          />
          <CustomTab 
            icon={<AnalyticsIcon sx={{ fontSize: '1.2rem' }} />} 
            label="Analysis" 
            index={1} 
          />
          <CustomTab 
            icon={<BorderAllIcon sx={{ fontSize: '1.2rem' }} />} 
            label="Boundaries" 
            index={2} 
          />
          <CustomTab 
            icon={<CompareArrowsIcon sx={{ fontSize: '1.2rem' }} />} 
            label="Scenarios" 
            index={3} 
          />
        </Tabs>
      </AppBar>
      
      <TabPanel value={tabValue} index={0}>
        <InitialSetup />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ReviewAndRevise />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <RedlineBottomline />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <NegotiationScenario />
      </TabPanel>
    </Box>
  );
};

export default MainLayout; 