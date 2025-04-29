import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';

// Main tabbed layout
import MainLayout from './components/MainLayout';
// Import ChatBotProvider and new ChatSplitScreen
import { ChatBotProvider } from './components/ChatBot';
import ChatSplitScreen from './components/ChatSplitScreen';

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

Always be constructive, specific, and focused on helping the user improve their negotiation strategy. Respond concisely but with enough detail to be helpful.`
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router {...routerOptions}>
          <ChatBotProvider 
            apiKey={OPENAI_API_KEY}
            useSplitScreen={true}
          >
            <ChatSplitScreen chatBotProps={chatBotProps}>
              <MainLayout />
            </ChatSplitScreen>
          </ChatBotProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 