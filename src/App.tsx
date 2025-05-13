import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';
import { Box, CircularProgress } from '@mui/material';
import { useEffect } from 'react';

// Main tabbed layout
import MainLayout from './components/MainLayout';
// Import ChatBotProvider and new ChatSplitScreen
import { ChatBotProvider } from './components/ChatBot';
import ChatSplitScreen from './components/ChatSplitScreen';
import { ChatBotWithState } from './components/ChatBot/ChatBotWithState';
// Import the DebugWindow component
import DebugWindow from './components/DebugWindow';
// Import Firebase Auth components
import { FirebaseAuthProvider, useFirebaseAuth } from './contexts/FirebaseAuthContext';
// Import Logging Provider
import { LoggingProvider } from './contexts/LoggingContext';
import { db, storage } from './firebase';
// Removed ProtectedRoute import as logic will be handled differently
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DemographicsSurvey from './pages/DemographicsSurvey';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Configure React Router future flags
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

// Get OpenAI API key from environment variable - use Vite's way of accessing env vars
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// ChatBot props
const chatBotProps = {
  apiKey: OPENAI_API_KEY,
  title: "A2B Assistant",
  subtitle: "How can I help you today?",
  primaryColor: theme.palette.primary.main,
  initialMessage: "Hello! I'm your negotiation assistant. I can help with analyzing case files, suggesting negotiation strategies, explaining components of your negotiation, and more. Please share the case file you'd like to analyze through the interface on the left. ",
  systemMessage: `You are an expert negotiation assistant for the A2B (Agreement to Better) platform.

Your purpose is to help users with:
1. Understanding and analyzing case files
2. Developing negotiation strategies
3. Identifying issues and boundaries in negotiations
4. Creating and refining Islands of Agreement (IoA)
5. Analyzing interests with the Iceberg tool
6. Providing feedback on negotiation scenarios

The application maintains state about several key components:
- Case File: The main text describing the negotiation situation
- Issues: Specific points to be negotiated
- Boundaries: Including redlines (absolute limits) and bottomlines (minimum acceptable terms) for each party
- Islands of Agreement (IoA): Points where parties already agree
- Iceberg Analysis: Deeper interests behind positions
- Scenarios: Potential negotiation outcomes

The system will automatically detect changes in these components and include them in your context. When you see [System: Changes detected in the negotiation state] or [System: Recent change history], pay careful attention to this information as it represents the user's current work.

You have access to the following generated content:
1. Islands of Agreement (IoA): Points where parties already agree, including contested facts, agreed facts, convergent norms, and divergent norms
2. Iceberg Analysis: Deeper interests behind positions, including surface positions, underlying interests, and hidden motives
3. Issues: Specific points to be negotiated, including their names, descriptions, and priority levels
4. Boundaries: Including redlines (absolute limits) and bottomlines (minimum acceptable terms) for each party
5. Scenarios: Potential negotiation outcomes, including redline violations, bottomline violations, and agreement areas for each party

Always be constructive, specific, and focused on helping the user improve their negotiation strategy. Respond concisely but with enough detail to be helpful.`
};

// Protected layout component
const ProtectedLayout = () => {
  const { user } = useFirebaseAuth();
  
  return (
    <LoggingProvider
      db={db}
      storage={storage}
      userId={user?.uid || null}
    >
      <ChatBotProvider 
        apiKey={OPENAI_API_KEY}
        useSplitScreen={true}
      >
        <ChatSplitScreen chatBotProps={chatBotProps}>
          <MainLayout />
        </ChatSplitScreen>
      </ChatBotProvider>
    </LoggingProvider>
  );
};

// New Wrapper Component to check Auth and Survey status
const AuthAndSurveyCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (location.pathname !== '/login' && location.pathname !== '/forgot-password' && location.pathname !== '/reset-password') {
          navigate('/login', { state: { from: location }, replace: true });
        }
      } else {
        if (!profile?.demographicsCompleted) {
          if (location.pathname !== '/demographics-survey') {
            navigate('/demographics-survey', { replace: true });
          }
        } else {
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/', { replace: true });
          }
        }
      }
    }
  }, [user, profile, loading, navigate, location]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FirebaseAuthProvider>
          <Router {...routerOptions}>
            {/* Wrap Routes that need checking with the new component */}
            <AuthAndSurveyCheck>
              <Routes>
                {/* Public routes that are okay even if logged in but survey incomplete */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/demographics-survey" element={<DemographicsSurvey />} />
                
                {/* Protected main application route */}
                {/* This route will only be reached if user is logged in AND survey is complete, 
                    due to the checks in AuthAndSurveyCheck */}
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </AuthAndSurveyCheck>
          </Router>
          {/* Add Debug window */}
          <DebugWindow />
        </FirebaseAuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 