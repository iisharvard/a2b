import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { indexCaseFile } from '../../store/ragSlice';
import { RootState } from '../../store';
import CaseSearch from './CaseSearch';

interface CaseSearchPanelProps {
  caseId: string;
  caseContent: string;
}

const CaseSearchPanel: React.FC<CaseSearchPanelProps> = ({ caseId, caseContent }) => {
  const dispatch = useDispatch();
  const { indexing, indexingStatus, error } = useSelector((state: RootState) => state.rag);
  
  const handleIndexCase = () => {
    dispatch(indexCaseFile({ caseId, content: caseContent }) as any);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Case Content Search
        </Typography>
        
        <Button
          variant="contained"
          onClick={handleIndexCase}
          disabled={indexing}
          startIcon={indexing ? <CircularProgress size={20} /> : null}
        >
          {indexing ? 'Indexing...' : 'Index Case for Search'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {indexingStatus && indexingStatus.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Successfully indexed case with {indexingStatus.chunksCount} chunks.
        </Alert>
      )}
      
      <CaseSearch caseId={caseId} />
    </Paper>
  );
};

export default CaseSearchPanel; 