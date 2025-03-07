import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress,
  Alert
} from '@mui/material';
import { searchCaseFile, clearSearchResults } from '../../store/ragSlice';
import { RootState } from '../../store';
import SearchResults from './SearchResults';

interface CaseSearchProps {
  caseId: string;
}

const CaseSearch: React.FC<CaseSearchProps> = ({ caseId }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const { searching, searchResults, error } = useSelector((state: RootState) => state.rag);
  
  const handleSearch = () => {
    if (query.trim()) {
      dispatch(searchCaseFile({ caseId, query: query.trim() }) as any);
    }
  };
  
  const handleClear = () => {
    setQuery('');
    dispatch(clearSearchResults());
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Search Case Content
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          fullWidth
          label="Enter your search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          size="small"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          disabled={searching}
        />
        <Button 
          variant="contained" 
          onClick={handleSearch}
          sx={{ ml: 1 }}
          disabled={!query.trim() || searching}
        >
          {searching ? <CircularProgress size={24} /> : 'Search'}
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleClear}
          sx={{ ml: 1 }}
          disabled={searching || (!query && searchResults.length === 0)}
        >
          Clear
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {searchResults.length > 0 && (
        <SearchResults results={searchResults} />
      )}
    </Box>
  );
};

export default CaseSearch; 