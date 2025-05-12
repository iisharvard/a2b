import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Link,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Firebase handles password reset on their own page, so we just redirect to login
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            Password Reset
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 3 }}>
            Firebase is handling your password reset
          </Typography>

          <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
            Password reset is being processed by Firebase. 
            If you followed the email link, you should have already set your new password.
            You will be redirected to the login page in a few seconds.
          </Alert>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Sign In
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword; 