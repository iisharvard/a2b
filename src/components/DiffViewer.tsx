import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { compareArrays } from '../utils/diffUtils';

interface DiffViewerProps {
  title: string;
  originalItems: any[];
  updatedItems: any[];
  idKey: string;
  nameKey?: string;
  showDetails?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  title,
  originalItems,
  updatedItems,
  idKey,
  nameKey = 'name',
  showDetails = false
}) => {
  // Compare the arrays
  const diff = compareArrays(originalItems, updatedItems, idKey);
  
  // Check if there are any differences
  const hasDiff = diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
  
  if (!hasDiff) {
    return null;
  }
  
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title} Changes
      </Typography>
      
      {diff.added.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'success.main', fontSize: '0.9rem' }}>
            Added ({diff.added.length})
          </Typography>
          {diff.added.map((item, index) => (
            <Box key={`added-${index}`} sx={{ ml: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.85rem' }}>
                + {item[nameKey] || item.id || `Item ${index + 1}`}
              </Typography>
              {showDetails && (
                <Box component="pre" sx={{ 
                  ml: 2, 
                  p: 1, 
                  bgcolor: 'success.light', 
                  color: 'success.contrastText',
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(item, null, 2)}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {diff.removed.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'error.main', fontSize: '0.9rem' }}>
            Removed ({diff.removed.length})
          </Typography>
          {diff.removed.map((item, index) => (
            <Box key={`removed-${index}`} sx={{ ml: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'error.main', fontSize: '0.85rem' }}>
                - {item[nameKey] || item.id || `Item ${index + 1}`}
              </Typography>
              {showDetails && (
                <Box component="pre" sx={{ 
                  ml: 2, 
                  p: 1, 
                  bgcolor: 'error.light', 
                  color: 'error.contrastText',
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(item, null, 2)}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {diff.changed.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'warning.main', fontSize: '0.9rem' }}>
            Changed ({diff.changed.length})
          </Typography>
          {diff.changed.map(({ old, new: newItem }, index) => (
            <Box key={`changed-${index}`} sx={{ ml: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'warning.main', fontSize: '0.85rem' }}>
                ~ {old[nameKey] || old.id || `Item ${index + 1}`}
              </Typography>
              {showDetails && (
                <Box sx={{ ml: 2 }}>
                  {Object.keys(old).map(key => {
                    if (JSON.stringify(old[key]) !== JSON.stringify(newItem[key])) {
                      return (
                        <Box key={key} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {key}:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box component="pre" sx={{ 
                              p: 1, 
                              bgcolor: 'error.light', 
                              color: 'error.contrastText',
                              fontSize: '0.75rem',
                              borderRadius: 1,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              - {JSON.stringify(old[key], null, 2)}
                            </Box>
                            <Box component="pre" sx={{ 
                              p: 1, 
                              bgcolor: 'success.light', 
                              color: 'success.contrastText',
                              fontSize: '0.75rem',
                              borderRadius: 1,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              + {JSON.stringify(newItem[key], null, 2)}
                            </Box>
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  })}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default DiffViewer; 