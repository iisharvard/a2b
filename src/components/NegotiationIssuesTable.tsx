import React, { useState, useEffect } from 'react';
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

const NegotiationIssuesTable: React.FC<NegotiationIssuesTableProps> = ({ value, onChange }) => {
  const [components, setComponents] = useState<Component[]>([]);

  // Parse the markdown content when it changes
  useEffect(() => {
    console.log("Received components data:", value);
    
    if (value) {
      const parsedComponents = parseComponentsFromMarkdown(value);
      console.log("Parsed components:", parsedComponents);
      setComponents(parsedComponents);
    } else {
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
      console.log("No value provided, using default component");
      setComponents([defaultComponent]);
    }
  }, [value]);

  // Update component data
  const handleComponentChange = (
    index: number, 
    field: keyof Component, 
    newValue: string | number
  ) => {
    const updatedComponents = [...components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      [field]: newValue
    };
    
    setComponents(updatedComponents);
    updateMarkdown(updatedComponents);
  };
  
  // Add a new component
  const handleAddComponent = () => {
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
    updateMarkdown(updatedComponents);
  };
  
  // Remove a component
  const handleRemoveComponent = (index: number) => {
    if (components.length <= 1) {
      // Keep at least one component
      return;
    }
    
    const updatedComponents = components.filter((_, i) => i !== index);
    setComponents(updatedComponents);
    updateMarkdown(updatedComponents);
  };

  // Convert components to markdown format
  const updateMarkdown = (componentsData: Component[]) => {
    const markdown = componentsToMarkdown(componentsData);
    console.log("Updating markdown:", markdown);
    onChange(markdown);
  };

  return (
    <TableWrapper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
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
              <StyledTableRow key={component.id} index={index}>
                <ContentCell>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={component.name}
                    onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
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
                    onChange={(e) => handleComponentChange(index, 'description', e.target.value)}
                    label="Description"
                    placeholder="Describe the issue, its importance, and any relevant details"
                  />
                </ContentCell>
                <ContentCell align="center">
                  <Tooltip title={components.length <= 1 ? "At least one issue is required" : "Remove this issue"}>
                    <span>
                      <IconButton 
                        color="error"
                        onClick={() => handleRemoveComponent(index)}
                        disabled={components.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </ContentCell>
              </StyledTableRow>
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

export default NegotiationIssuesTable; 