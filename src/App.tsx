import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';

// Main tabbed layout
import MainLayout from './components/MainLayout';
// Import the DebugWindow component
import DebugWindow from './components/DebugWindow';

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


// Main layout component without authentication
const AppLayout = () => {
  return <MainLayout />;
};


function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router {...routerOptions}>
          <Routes>
            {/* Main application route - no authentication required */}
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Router>
        {/* Add Debug window */}
        <DebugWindow />
      </ThemeProvider>
    </Provider>
  );
}

export default App; 