import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  styled,
  TextField,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Component } from '../store/negotiationSlice';
import { parseComponentsFromMarkdown, componentsToMarkdown } from '../utils/componentParser';

// Define styled components for the table
const TableWrapper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const HeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  fontWeight: 'bold',
  padding: '16px',
  fontSize: '1rem',
}));

const ContentCell = styled(TableCell)(({ theme }) => ({
  padding: '16px',
  verticalAlign: 'top',
  '& .MuiTextField-root': {
    marginBottom: theme.spacing(1),
  },
}));

const StyledTableRow = styled(TableRow)<{ index: number }>(({ theme, index }) => ({
  backgroundColor: index % 2 === 0 ? 'inherit' : theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

interface NegotiationIssuesTableProps {
  value: string;
  onChange: (value: string) => void;
}

interface ComponentRowProps {
  component: Component;
  index: number;
  onComponentChange: (index: number, field: keyof Component, value: string | number) => void;
  onBlur: () => void;
  onRemove: (index: number) => void;
  isRemoveDisabled: boolean;
}

// Memoized component row to prevent unnecessary re-renders
const ComponentRow = memo(({
  component, 
  index, 
  onComponentChange, 
  onBlur, 
  onRemove, 
  isRemoveDisabled
}: ComponentRowProps) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onComponentChange(index, 'name', e.target.value);
    // We don't call onBlur here since we're already saving in handleComponentChange
  };
  
  const handleDescChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onComponentChange(index, 'description', e.target.value);
    // We don't call onBlur here since we're already saving in handleComponentChange
  };
  
  return (
    <StyledTableRow index={index}>
      <ContentCell>
        <TextField
          fullWidth
          variant="outlined"
          value={component.name}
          onChange={handleNameChange}
          onBlur={onBlur} // Keep blur as backup
          label="Issue Name"
          placeholder="Enter a clear name for this issue"
        />
      </ContentCell>
      <ContentCell>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={component.description}
          onChange={handleDescChange}
          onBlur={onBlur} // Keep blur as backup
          label="Description"
          placeholder="Describe the issue, its importance, and any relevant details"
        />
      </ContentCell>
      <ContentCell align="center">
        <Tooltip title={isRemoveDisabled ? "At least one issue is required" : "Remove this issue"}>
          <span>
            <IconButton 
              color="error"
              onClick={() => onRemove(index)}
              disabled={isRemoveDisabled}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      </ContentCell>
    </StyledTableRow>
  );
});

ComponentRow.displayName = 'ComponentRow';

const NegotiationIssuesTable: React.FC<NegotiationIssuesTableProps> = ({ value, onChange }) => {
  const [components, setComponents] = useState<Component[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatePendingRef = useRef(false);

  // Parse the markdown content when it changes
  useEffect(() => {
    if (!updatePendingRef.current && value) {
      const parsedComponents = parseComponentsFromMarkdown(value);
      setComponents(parsedComponents);
    } else if (!value) {
      // If no value is provided, set default data
      const defaultComponent: Component = {
        id: `${Date.now()}-0`,
        name: 'New Issue',
        description: 'Description of the issue',
        redlineParty1: '',
        bottomlineParty1: '',
        redlineParty2: '',
        bottomlineParty2: '',
        priority: 0
      };
      setComponents([defaultComponent]);
    }
    updatePendingRef.current = false;
  }, [value]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save changes with debounce
  const debounceSaveChanges = useCallback((componentsToSave: Component[]) => {
    // Set update pending flag to prevent immediate re-parsing
    updatePendingRef.current = true;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save changes after a delay
    saveTimeoutRef.current = setTimeout(() => {
      // Force a deep clone to ensure the changes propagate correctly
      const componentsCopy = JSON.parse(JSON.stringify(componentsToSave));
      const markdown = componentsToMarkdown(componentsCopy);
      
      // Save the changes to parent component
      onChange(markdown);
      
      // Reset the flag after a small delay to ensure the update completes
      setTimeout(() => {
        updatePendingRef.current = false;
      }, 50);
    }, 200); // Reduced delay to 200ms for more responsive typing
  }, [onChange]);

  // Update component data 
  const handleComponentChange = useCallback((
    index: number, 
    field: keyof Component, 
    newValue: string | number
  ) => {
    setComponents(currentComponents => {
      const updatedComponents = [...currentComponents];
      updatedComponents[index] = {
        ...updatedComponents[index],
        [field]: newValue
      };
      
      // Save changes immediately with debouncing
      debounceSaveChanges(updatedComponents);
      
      return updatedComponents;
    });
  }, [debounceSaveChanges]);
  
  // Commit changes after user finishes editing - keeping this as a backup
  const handleBlur = useCallback(() => {
    // Force an immediate save when focus is lost
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    debounceSaveChanges(components);
  }, [components, debounceSaveChanges]);
  
  // Add a new component
  const handleAddComponent = useCallback(() => {
    const newComponent: Component = {
      id: `${Date.now()}-${components.length}`,
      name: `Issue ${components.length + 1}`,
      description: 'Description of the issue',
      redlineParty1: '',
      bottomlineParty1: '',
      redlineParty2: '',
      bottomlineParty2: '',
      priority: components.length
    };
    
    const updatedComponents = [...components, newComponent];
    setComponents(updatedComponents);
    
    // Save immediately for add operation
    const markdown = componentsToMarkdown(updatedComponents);
    updatePendingRef.current = true;
    onChange(markdown);
  }, [components, onChange]);
  
  // Remove a component
  const handleRemoveComponent = useCallback((index: number) => {
    if (components.length <= 1) {
      // Keep at least one component
      return;
    }
    
    const updatedComponents = components.filter((_, i) => i !== index);
    setComponents(updatedComponents);
    
    // Save immediately for remove operation
    const markdown = componentsToMarkdown(updatedComponents);
    updatePendingRef.current = true;
    onChange(markdown);
  }, [components, onChange]);

  return (
    <TableWrapper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Issues to Negotiate
        </Typography>
        <Tooltip title="Add a new issue to negotiate">
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddComponent}
            sx={{ mb: 1 }}
          >
            Add Issue
          </Button>
        </Tooltip>
      </Box>
      
      <TableContainer sx={{ mb: 3 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <HeaderCell width="30%">Issue Name</HeaderCell>
              <HeaderCell width="60%">Description</HeaderCell>
              <HeaderCell width="10%" align="center">Actions</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {components.map((component, index) => (
              <ComponentRow
                key={component.id}
                component={component}
                index={index}
                onComponentChange={handleComponentChange}
                onBlur={handleBlur}
                onRemove={handleRemoveComponent}
                isRemoveDisabled={components.length <= 1}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Issues to Negotiate</strong> are the key components that need to be addressed in your negotiation.
        </Typography>
        <Typography variant="body2">
          Add each issue with a clear name and detailed description. During the next steps, you'll define positions and boundaries for each issue.
        </Typography>
      </Box>
    </TableWrapper>
  );
};

export default memo(NegotiationIssuesTable); 