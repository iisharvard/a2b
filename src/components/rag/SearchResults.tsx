import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  Divider,
  Chip
} from '@mui/material';

interface SearchResultProps {
  results: Array<{
    text: string;
    metadata: {
      source: string;
      position: number;
      caseId: string;
    };
  }>;
}

const SearchResults: React.FC<SearchResultProps> = ({ results }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Search Results ({results.length})
      </Typography>
      
      <List>
        {results.map((result, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Divider sx={{ my: 2 }} />}
            <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
              <Box sx={{ mb: 1, width: '100%' }}>
                <Typography variant="body1" component="div" sx={{ mb: 1 }}>
                  {result.text}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`Source: ${result.metadata.source}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Position: ${result.metadata.position}`} 
                    size="small" 
                    color="secondary" 
                    variant="outlined"
                  />
                </Box>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default SearchResults; 