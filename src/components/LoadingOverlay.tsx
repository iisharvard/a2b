import { Backdrop, CircularProgress, Typography, Box, Paper, keyframes } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

// Create a pulsing animation
const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const LoadingOverlay = ({ open, message = 'Processing...' }: LoadingOverlayProps) => {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: 'blur(3px)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
      }}
      open={open}
    >
      <Paper
        elevation={4}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          maxWidth: '80%',
          textAlign: 'center'
        }}
      >
        <CircularProgress 
          color="primary" 
          size={56}
          thickness={4}
          sx={{
            mb: 2,
            animation: `${pulse} 1.5s ease-in-out infinite`
          }}
        />
        <Typography 
          variant="h6" 
          color="text.primary"
          sx={{ 
            fontWeight: 'medium',
            animation: `${pulse} 1.5s ease-in-out infinite`,
            animationDelay: '0.5s'
          }}
        >
          {message}
        </Typography>
      </Paper>
    </Backdrop>
  );
};

export default LoadingOverlay; 