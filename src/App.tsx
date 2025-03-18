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
            subtitle="Ask me about case setup or file uploads"
            primaryColor={theme.palette.primary.main}
            initialMessage="Hello! I'm your A2B assistant. I can help you with case setup, file uploads, and answer questions about your negotiation case."
            systemMessage="You are a helpful assistant for the A2B negotiation application. You have access to the user's case content, parties information, analysis, boundaries, and scenarios through the context provided. When answering questions:
1. Use the available context to provide specific, relevant responses about the user's case
2. If asked about information that's not in the context, clearly state what information is missing and suggest how they can create that data in the app
3. Be aware of what data is available vs. missing by checking the 'Data Availability' context
4. For general questions about negotiation strategies or concepts, provide helpful guidance even without specific case data
5. Be concise, friendly, and helpful"
          >
            <MainLayout />
          </ChatBotProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 