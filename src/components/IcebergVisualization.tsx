import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
  Button,
  CircularProgress
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { callLanguageModel } from '../services/api/promptHandler';

// Define styled components for the visualization
const VisualizationContainer = styled(Paper)(({ theme }) => ({
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
  textAlign: 'center',
  padding: '16px',
  fontSize: '1rem',
  width: '30%', // Each party column takes 30% of the width
}));

const FirstHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  width: '10%', // Label column takes 10% of the width
}));

const LabelCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  fontWeight: 'bold',
  width: '10%',
  verticalAlign: 'top',
  padding: '16px',
}));

const ContentCell = styled(TableCell)(({ theme }) => ({
  padding: '16px',
  verticalAlign: 'top',
  minHeight: '150px',
  width: '30%',
  '&[contentEditable="true"]': {
    outline: 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    '&:focus': {
      boxShadow: 'inset 0 0 0 2px ' + theme.palette.primary.main,
    },
  },
  '& ul': {
    paddingLeft: '20px',
    marginTop: 0,
    marginBottom: 0
  },
  '& li': {
    marginBottom: '8px'
  }
}));

const SharedCell = styled(TableCell)(({ theme }) => ({
  padding: '16px',
  verticalAlign: 'top',
  width: '30%',
  borderLeft: `1px dashed ${theme.palette.primary.main}`,
  borderRight: `1px dashed ${theme.palette.primary.main}`,
  '&[contentEditable="true"]': {
    outline: 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    '&:focus': {
      boxShadow: 'inset 0 0 0 2px ' + theme.palette.primary.main,
    },
  },
  '& ul': {
    paddingLeft: '20px',
    marginTop: 0,
    marginBottom: 0
  },
  '& li': {
    marginBottom: '8px'
  }
}));

interface IcebergVisualizationProps {
  value: string;
  onChange: (value: string) => void;
  party1Name?: string;
  party2Name?: string;
}

interface IcebergData {
  party1: {
    name: string;
    positions: string[];
    reasoning: string[];
    values: string[];
  };
  party2: {
    name: string;
    positions: string[];
    reasoning: string[];
    values: string[];
  };
  shared: {
    positions: string[];
    reasoning: string[];
    values: string[];
  };
}

interface SharedGenerationInput {
  party1Name: string;
  party2Name: string;
  party1Positions: string[];
  party1Reasoning: string[];
  party1Values: string[];
  party2Positions: string[];
  party2Reasoning: string[];
  party2Values: string[];
}

const IcebergVisualization: React.FC<IcebergVisualizationProps> = ({ 
  value, 
  onChange,
  party1Name = "User's Organization",
  party2Name = "Counterparty"
}) => {
  const [icebergData, setIcebergData] = useState<IcebergData>({
    party1: { name: party1Name, positions: [] as string[], reasoning: [] as string[], values: [] as string[] },
    party2: { name: party2Name, positions: [] as string[], reasoning: [] as string[], values: [] as string[] },
    shared: { positions: [] as string[], reasoning: [] as string[], values: [] as string[] }
  });
  const [isGeneratingShared, setIsGeneratingShared] = useState(false);

  // Parse the markdown content when it changes
  useEffect(() => {
    if (value) {
      setIcebergData(parseMarkdown(value));
    } else {
      const defaultData = {
        party1: {
          name: party1Name,
          positions: ["Position 1 - Click to edit"],
          reasoning: ["Reasoning 1 - Click to edit"],
          values: ["Value 1 - Click to edit"],
        },
        party2: {
          name: party2Name,
          positions: ["Position 1 - Click to edit"],
          reasoning: ["Reasoning 1 - Click to edit"],
          values: ["Value 1 - Click to edit"],
        },
        shared: {
          positions: ["Potential shared position - Click to edit"],
          reasoning: ["Potential shared reasoning - Click to edit"],
          values: ["Potential shared value - Click to edit"],
        }
      };
      setIcebergData(defaultData);
    }
  }, [value, party1Name, party2Name]);

  // Helper function to parse markdown content
  const parseMarkdown = (markdown: string) => {
    const party1 = { name: party1Name, positions: [] as string[], reasoning: [] as string[], values: [] as string[] };
    const party2 = { name: party2Name, positions: [] as string[], reasoning: [] as string[], values: [] as string[] };
    const shared = { positions: [] as string[], reasoning: [] as string[], values: [] as string[] };

    // Simple parser for the markdown format
    const lines = markdown.split('\n');
    let currentParty = '';
    let currentSection = '';

    for (const line of lines) {
      // Detect party sections - look for different possible formats
      if (line.match(/^## Party 1/) || line.match(/^## .*Organization/) || line.match(/^## .*User.*/) || line.match(/^## .*Your.*/) || line.match(/^## .*We.*/)) {
        currentParty = 'party1';
        // Extract party name if available
        const nameMatch = line.match(/## (.*?)($|\()/);
        if (nameMatch && nameMatch[1]) {
          party1.name = nameMatch[1].trim();
        }
        continue;
      } else if (line.match(/^## Party 2/) || line.match(/^## .*Counter.*/) || line.match(/^## .*They.*/) || line.match(/^## .*Them.*/)) {
        currentParty = 'party2';
        // Extract party name if available
        const nameMatch = line.match(/## (.*?)($|\()/);
        if (nameMatch && nameMatch[1]) {
          party2.name = nameMatch[1].trim();
        }
        continue;
      } else if (line.match(/^## Shared/) || line.match(/^## Common.*/) || line.match(/^## Both.*/)) {
        currentParty = 'shared';
        continue;
      }

      // Detect section types - now handling ### instead of ## and handling singular forms
      if (line.match(/^### Position/) || line.match(/^### Positions/) || line.match(/^### What/)) {
        currentSection = 'positions';
        continue;
      } else if (line.match(/^### Reasoning/) || line.match(/^### How/)) {
        currentSection = 'reasoning';
        continue;
      } else if (line.match(/^### Values/) || line.match(/^### Value/) || line.match(/^### Motives/) || line.match(/^### Motive/) || line.match(/^### Why/)) {
        currentSection = 'values';
        continue;
      }

      // Extract bullet points
      if (line.trim().startsWith('- ') && currentParty && currentSection) {
        const item = line.trim().substring(2).trim();
        if (item) {
          if (currentParty === 'party1') {
            if (currentSection === 'positions') {
              party1.positions.push(item);
            } else if (currentSection === 'reasoning') {
              party1.reasoning.push(item);
            } else if (currentSection === 'values') {
              party1.values.push(item);
            }
          } else if (currentParty === 'party2') {
            if (currentSection === 'positions') {
              party2.positions.push(item);
            } else if (currentSection === 'reasoning') {
              party2.reasoning.push(item);
            } else if (currentSection === 'values') {
              party2.values.push(item);
            }
          } else if (currentParty === 'shared') {
            if (currentSection === 'positions') {
              shared.positions.push(item);
            } else if (currentSection === 'reasoning') {
              shared.reasoning.push(item);
            } else if (currentSection === 'values') {
              shared.values.push(item);
            }
          }
        }
      }
    }

    // If no shared data was explicitly defined, generate it by finding common items
    if (!shared.positions.length && !shared.reasoning.length && !shared.values.length) {
      // Find common positions
      shared.positions = findSharedItems(party1.positions, party2.positions);
      
      // Find common reasoning
      shared.reasoning = findSharedItems(party1.reasoning, party2.reasoning);
      
      // Find common values
      shared.values = findSharedItems(party1.values, party2.values);
    }

    // If positions are still empty, add default placeholder positions
    if (party1.positions.length === 0) {
      party1.positions = ["Position 1 - Click to edit"];
    }
    if (party2.positions.length === 0) {
      party2.positions = ["Position 1 - Click to edit"];
    }
    if (shared.positions.length === 0) {
      shared.positions = ["Potential shared position - Click to edit"];
    }
    
    // Ensure reasoning and values are populated too
    if (party1.reasoning.length === 0) {
      party1.reasoning = ["Reasoning 1 - Click to edit"];
    }
    if (party1.values.length === 0) {
      party1.values = ["Value 1 - Click to edit"];
    }
    if (party2.reasoning.length === 0) {
      party2.reasoning = ["Reasoning 1 - Click to edit"];
    }
    if (party2.values.length === 0) {
      party2.values = ["Value 1 - Click to edit"];
    }
    if (shared.reasoning.length === 0) {
      shared.reasoning = ["Potential shared reasoning - Click to edit"];
    }
    if (shared.values.length === 0) {
      shared.values = ["Potential shared value - Click to edit"];
    }
    
    return { party1, party2, shared };
  };

  // Function to find shared items between two arrays based on text similarity
  const findSharedItems = (items1: string[], items2: string[]) => {
    const sharedItems: string[] = [];
    
    // First, look for exact matches
    const exactMatches = items1.filter(item1 => 
      items2.some(item2 => item2.toLowerCase() === item1.toLowerCase())
    );
    sharedItems.push(...exactMatches);
    
    // Then look for partial matches (one text contains the other)
    items1.forEach(item1 => {
      if (!sharedItems.some(item => item.toLowerCase() === item1.toLowerCase())) {
        const similarItem = items2.find(item2 => 
          !sharedItems.some(item => item.toLowerCase() === item2.toLowerCase()) &&
          (item2.toLowerCase().includes(item1.toLowerCase()) || 
           item1.toLowerCase().includes(item2.toLowerCase()))
        );
        
        if (similarItem) {
          const shorterItem = item1.length < similarItem.length ? item1 : similarItem;
          sharedItems.push(shorterItem);
        }
      }
    });
    
    return sharedItems.length > 0 ? sharedItems : [];
  };

  // Function to generate shared content using the language model
  const generateSharedContentWithLLM = async () => {
    try {
      setIsGeneratingShared(true);
      
      // Create input for the language model
      const input: SharedGenerationInput = {
        party1Name: party1Name,
        party2Name: party2Name,
        party1Positions: icebergData.party1.positions,
        party1Reasoning: icebergData.party1.reasoning,
        party1Values: icebergData.party1.values,
        party2Positions: icebergData.party2.positions,
        party2Reasoning: icebergData.party2.reasoning,
        party2Values: icebergData.party2.values
      };
      
      // Call the language model
      const response = await callLanguageModel('generateShared.txt', input);
      
      if (response && response.shared) {
        const newData = { ...icebergData };
        
        // Update shared content with the model's response
        if (response.shared.positions && response.shared.positions.length > 0) {
          newData.shared.positions = response.shared.positions;
        }
        
        if (response.shared.reasoning && response.shared.reasoning.length > 0) {
          newData.shared.reasoning = response.shared.reasoning;
        }
        
        if (response.shared.values && response.shared.values.length > 0) {
          newData.shared.values = response.shared.values;
        }
        
        setIcebergData(newData);
        updateMarkdown(newData);
      } else {
        // Fall back to algorithm-based approach if the LLM fails
        generateSharedContentWithAlgorithm();
      }
    } catch (error) {
      // Fall back to algorithm-based approach if the LLM fails
      generateSharedContentWithAlgorithm();
    } finally {
      setIsGeneratingShared(false);
    }
  };

  // Function to generate shared content based on current party content (fallback algorithm)
  const generateSharedContentWithAlgorithm = () => {
    const newData = { ...icebergData };
    
    // Generate shared positions
    newData.shared.positions = findSharedItems(
      newData.party1.positions, 
      newData.party2.positions
    );
    
    // Generate shared reasoning
    newData.shared.reasoning = findSharedItems(
      newData.party1.reasoning, 
      newData.party2.reasoning
    );
    
    // Generate shared values
    newData.shared.values = findSharedItems(
      newData.party1.values, 
      newData.party2.values
    );
    
    // Ensure we have at least placeholder items if no shared items were found
    if (newData.shared.positions.length === 0) {
      newData.shared.positions = ["No shared positions identified - Click to edit"];
    }
    if (newData.shared.reasoning.length === 0) {
      newData.shared.reasoning = ["No shared reasoning identified - Click to edit"];
    }
    if (newData.shared.values.length === 0) {
      newData.shared.values = ["No shared values identified - Click to edit"];
    }
    
    setIcebergData(newData);
    updateMarkdown(newData);
  };

  // Convert iceberg data back to markdown format
  const updateMarkdown = (newData: IcebergData) => {
    const markdown = `# Iceberg Analysis

## ${newData.party1.name}

### Position (What)
${newData.party1.positions.map(p => `- ${p}`).join('\n')}

### Reasoning (How)
${newData.party1.reasoning.map(r => `- ${r}`).join('\n')}

### Motives (Why)
${newData.party1.values.map(v => `- ${v}`).join('\n')}

## ${newData.party2.name}

### Position (What)
${newData.party2.positions.map(p => `- ${p}`).join('\n')}

### Reasoning (How)
${newData.party2.reasoning.map(r => `- ${r}`).join('\n')}

### Motives (Why)
${newData.party2.values.map(v => `- ${v}`).join('\n')}

## Shared

### Position (What)
${newData.shared.positions.map(p => `- ${p}`).join('\n')}

### Reasoning (How)
${newData.shared.reasoning.map(r => `- ${r}`).join('\n')}

### Motives (Why)
${newData.shared.values.map(v => `- ${v}`).join('\n')}
`;
    onChange(markdown);
  };

  // Format cell content as bullet points
  const formatContentAsList = (items: string[]) => {
    return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  };

  // Handle content updates from editable cells
  const handleContentUpdate = (
    party: 'party1' | 'party2' | 'shared',
    section: 'positions' | 'reasoning' | 'values',
    content: string
  ) => {
    const newData = { ...icebergData };
    
    // Split by lines and filter empty lines
    const items = content
      .split(/\n|<br>|<div>|<\/div>/)
      .map(line => line.replace(/<\/?[^>]+(>|$)/g, '').trim())
      .filter(line => line.length > 0);
    
    // Ensure we always have at least one item
    if (items.length === 0) {
      items.push(`Click to add ${section}...`);
    }
    
    newData[party][section] = items;
    setIcebergData(newData);
    updateMarkdown(newData);
  };

  return (
    <VisualizationContainer>
      <Typography variant="h5" gutterBottom>
        Iceberg Analysis
      </Typography>
      
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <FirstHeaderCell></FirstHeaderCell>
              <HeaderCell>{party1Name}</HeaderCell>
              <HeaderCell>Shared</HeaderCell>
              <HeaderCell>{party2Name}</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Positions Row */}
            <TableRow>
              <LabelCell>Positions (What)</LabelCell>
              <ContentCell 
                sx={{ backgroundColor: '#f5f5f5' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party1.positions)
                }}
                onBlur={(e) => handleContentUpdate('party1', 'positions', e.currentTarget.innerText)}
              />
              <SharedCell 
                sx={{ backgroundColor: '#f5f5f5' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.shared.positions)
                }}
                onBlur={(e) => handleContentUpdate('shared', 'positions', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#f5f5f5' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party2.positions)
                }}
                onBlur={(e) => handleContentUpdate('party2', 'positions', e.currentTarget.innerText)}
              />
            </TableRow>
            
            {/* Reasoning Row */}
            <TableRow>
              <LabelCell>Reasoning (How)</LabelCell>
              <ContentCell 
                sx={{ backgroundColor: '#e8eaf6' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party1.reasoning)
                }}
                onBlur={(e) => handleContentUpdate('party1', 'reasoning', e.currentTarget.innerText)}
              />
              <SharedCell 
                sx={{ backgroundColor: '#e8eaf6' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.shared.reasoning)
                }}
                onBlur={(e) => handleContentUpdate('shared', 'reasoning', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e8eaf6' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party2.reasoning)
                }}
                onBlur={(e) => handleContentUpdate('party2', 'reasoning', e.currentTarget.innerText)}
              />
            </TableRow>
            
            {/* Values Row */}
            <TableRow>
              <LabelCell>Values (Why)</LabelCell>
              <ContentCell 
                sx={{ backgroundColor: '#e3f2fd' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party1.values)
                }}
                onBlur={(e) => handleContentUpdate('party1', 'values', e.currentTarget.innerText)}
              />
              <SharedCell 
                sx={{ backgroundColor: '#e3f2fd' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.shared.values)
                }}
                onBlur={(e) => handleContentUpdate('shared', 'values', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e3f2fd' }}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(icebergData.party2.values)
                }}
                onBlur={(e) => handleContentUpdate('party2', 'values', e.currentTarget.innerText)}
              />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={isGeneratingShared ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
          onClick={generateSharedContentWithLLM}
          disabled={isGeneratingShared}
          sx={{ mb: 2 }}
        >
          {isGeneratingShared ? 'Generating...' : 'Generate Shared Content with AI'}
        </Button>
      </Box>
      
      <Box sx={{ mt: 1, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Positions</strong> (What): The visible demands or stances taken by each party
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Reasoning</strong> (How): The tactical reasoning that supports the positions
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Values</strong> (Why): The underlying motives and values driving the reasoning
        </Typography>
      </Box>
    </VisualizationContainer>
  );
};

export default IcebergVisualization; 