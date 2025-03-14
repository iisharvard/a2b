import React from 'react';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
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
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2,
        boxShadow: 1,
        bgcolor: 'background.paper'
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 'medium',
          color: 'text.primary',
          mb: 2
        }}
      >
        {title} Changes
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {diff.added.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip 
              icon={<AddIcon />} 
              label={`Added (${diff.added.length})`} 
              color="success" 
              size="small"
              variant="filled"
              sx={{ 
                fontWeight: 'medium',
                borderRadius: 1.5
              }}
            />
          </Box>
          
          {diff.added.map((item, index) => (
            <Box 
              key={`added-${index}`} 
              sx={{ 
                ml: 2, 
                mb: 2,
                borderLeft: '2px solid',
                borderColor: 'success.main',
                pl: 2
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'success.main', 
                  fontSize: '0.9rem',
                  fontWeight: 'medium'
                }}
              >
                {item[nameKey] || item.id || `Item ${index + 1}`}
              </Typography>
              
              {showDetails && (
                <Box 
                  component="pre" 
                  sx={{ 
                    mt: 1,
                    p: 2, 
                    bgcolor: 'success.light', 
                    color: 'success.contrastText',
                    fontSize: '0.8rem',
                    borderRadius: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflow: 'auto',
                    boxShadow: 1
                  }}
                >
                  {JSON.stringify(item, null, 2)}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {diff.removed.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip 
              icon={<RemoveIcon />} 
              label={`Removed (${diff.removed.length})`} 
              color="error" 
              size="small"
              variant="filled"
              sx={{ 
                fontWeight: 'medium',
                borderRadius: 1.5
              }}
            />
          </Box>
          
          {diff.removed.map((item, index) => (
            <Box 
              key={`removed-${index}`} 
              sx={{ 
                ml: 2, 
                mb: 2,
                borderLeft: '2px solid',
                borderColor: 'error.main',
                pl: 2
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'error.main', 
                  fontSize: '0.9rem',
                  fontWeight: 'medium'
                }}
              >
                {item[nameKey] || item.id || `Item ${index + 1}`}
              </Typography>
              
              {showDetails && (
                <Box 
                  component="pre" 
                  sx={{ 
                    mt: 1,
                    p: 2, 
                    bgcolor: 'error.light', 
                    color: 'error.contrastText',
                    fontSize: '0.8rem',
                    borderRadius: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflow: 'auto',
                    boxShadow: 1
                  }}
                >
                  {JSON.stringify(item, null, 2)}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {diff.changed.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip 
              icon={<CompareArrowsIcon />} 
              label={`Changed (${diff.changed.length})`} 
              color="warning" 
              size="small"
              variant="filled"
              sx={{ 
                fontWeight: 'medium',
                borderRadius: 1.5
              }}
            />
          </Box>
          
          {diff.changed.map(({ old, new: newItem }, index) => (
            <Box 
              key={`changed-${index}`} 
              sx={{ 
                ml: 2, 
                mb: 3,
                borderLeft: '2px solid',
                borderColor: 'warning.main',
                pl: 2
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'warning.main', 
                  fontSize: '0.9rem',
                  fontWeight: 'medium',
                  mb: 1
                }}
              >
                {old[nameKey] || old.id || `Item ${index + 1}`}
              </Typography>
              
              {showDetails && (
                <Box sx={{ ml: 1 }}>
                  {Object.keys(old).map(key => {
                    if (JSON.stringify(old[key]) !== JSON.stringify(newItem[key])) {
                      return (
                        <Box key={key} sx={{ mb: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.85rem', 
                              fontWeight: 'bold',
                              mb: 1,
                              color: 'text.secondary'
                            }}
                          >
                            {key}:
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box 
                              component="pre" 
                              sx={{ 
                                p: 2, 
                                bgcolor: 'error.light', 
                                color: 'error.contrastText',
                                fontSize: '0.8rem',
                                borderRadius: 1.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '150px',
                                overflow: 'auto',
                                boxShadow: 1
                              }}
                            >
                              <Typography 
                                component="span" 
                                sx={{ 
                                  display: 'block', 
                                  fontWeight: 'bold', 
                                  mb: 1,
                                  fontSize: '0.75rem'
                                }}
                              >
                                Previous Value:
                              </Typography>
                              {JSON.stringify(old[key], null, 2)}
                            </Box>
                            
                            <Box 
                              component="pre" 
                              sx={{ 
                                p: 2, 
                                bgcolor: 'success.light', 
                                color: 'success.contrastText',
                                fontSize: '0.8rem',
                                borderRadius: 1.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '150px',
                                overflow: 'auto',
                                boxShadow: 1
                              }}
                            >
                              <Typography 
                                component="span" 
                                sx={{ 
                                  display: 'block', 
                                  fontWeight: 'bold', 
                                  mb: 1,
                                  fontSize: '0.75rem'
                                }}
                              >
                                New Value:
                              </Typography>
                              {JSON.stringify(newItem[key], null, 2)}
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