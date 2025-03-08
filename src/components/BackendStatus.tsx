import React, { useEffect, useState } from 'react';
import { ragApi } from '../services/backendApi';
import { Alert, Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface BackendStatusProps {
  showDetails?: boolean;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ showDetails = false }) => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await ragApi.checkHealth();
        if (health.status === 'ok') {
          setStatus('connected');
          setDetails(health.services);
        } else {
          setStatus('error');
          setErrorMessage('Backend service is not healthy');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <CircularProgress size={16} />;
      case 'connected':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
    }
  };

  const renderStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Connecting to backend...';
      case 'connected':
        return 'Backend connected';
      case 'error':
        return 'Backend connection error';
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {renderStatusIcon()}
      <Typography variant="body2" color={status === 'error' ? 'error' : 'textSecondary'}>
        {renderStatusText()}
      </Typography>
      
      {status === 'connected' && (
        <Tooltip title="Backend services are running properly">
          <HelpOutlineIcon fontSize="small" color="action" />
        </Tooltip>
      )}
      
      {status === 'error' && (
        <Tooltip title={errorMessage}>
          <HelpOutlineIcon fontSize="small" color="error" />
        </Tooltip>
      )}
      
      {showDetails && status === 'connected' && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Services:</Typography>
          <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
            {Object.entries(details).map(([service, serviceStatus]) => (
              <Box component="li" key={service} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  {service}: 
                </Typography>
                {serviceStatus === 'connected' ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <ErrorIcon color="error" fontSize="small" />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      {showDetails && status === 'error' && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errorMessage}
        </Alert>
      )}
    </Box>
  );
};

export default BackendStatus; 