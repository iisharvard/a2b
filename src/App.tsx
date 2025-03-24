import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';

// Main tabbed layout
import MainLayout from './components/MainLayout';
// Import ChatBotProvider
import { ChatBotProvider } from './components/ChatBot';

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

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router {...routerOptions}>
          <ChatBotProvider 
            apiKey={OPENAI_API_KEY}
            title="A2B Assistant"
            subtitle="How can I help you today?"
            primaryColor={theme.palette.primary.main}
            initialMessage="Hello! I'm your assistant. How can I help you today?"
            systemMessage="You are a helpful assistant. Be concise and direct in your responses."
          >
            <MainLayout />
          </ChatBotProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 