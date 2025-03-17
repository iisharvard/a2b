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
  styled
} from '@mui/material';

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
  textAlign: 'center',
  padding: '16px',
  fontSize: '1rem',
}));

const ContentCell = styled(TableCell)(({ theme }) => ({
  padding: '16px',
  verticalAlign: 'top',
  minHeight: '150px',
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

interface IslandOfAgreementsTableProps {
  value: string;
  onChange: (value: string) => void;
}

interface IslandData {
  contestedFacts: string[];
  agreedFacts: string[];
  convergentNorms: string[];
  divergentNorms: string[];
}

const IslandOfAgreementsTable: React.FC<IslandOfAgreementsTableProps> = ({ value, onChange }) => {
  const [islandData, setIslandData] = useState<IslandData>({
    contestedFacts: [],
    agreedFacts: [],
    convergentNorms: [],
    divergentNorms: []
  });

  // Parse the markdown content when it changes
  useEffect(() => {
    console.log("Received IoA data:", value);
    
    const parseMarkdown = (markdown: string) => {
      const data: IslandData = {
        contestedFacts: [],
        agreedFacts: [],
        convergentNorms: [],
        divergentNorms: []
      };

      // Simple parser for the markdown format
      const lines = markdown.split('\n');
      let currentSection = '';

      console.log("Parsing markdown lines:", lines);

      for (const line of lines) {
        // Detect section headings
        if (line.match(/^## Contested Facts/i)) {
          currentSection = 'contestedFacts';
          console.log("Found Contested Facts section");
          continue;
        } else if (line.match(/^## Agreed Facts/i)) {
          currentSection = 'agreedFacts';
          console.log("Found Agreed Facts section");
          continue;
        } else if (line.match(/^## Convergent Norms/i)) {
          currentSection = 'convergentNorms';
          console.log("Found Convergent Norms section");
          continue;
        } else if (line.match(/^## Divergent Norms/i)) {
          currentSection = 'divergentNorms';
          console.log("Found Divergent Norms section");
          continue;
        }

        // Extract bullet points
        if (line.trim().startsWith('- ') && currentSection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            data[currentSection as keyof IslandData].push(item);
            console.log(`Added item to ${currentSection}: ${item}`);
          }
        }
      }

      // Ensure there's at least one item in each section
      if (data.contestedFacts.length === 0) data.contestedFacts = ["Click to add contested facts..."];
      if (data.agreedFacts.length === 0) data.agreedFacts = ["Click to add agreed facts..."];
      if (data.convergentNorms.length === 0) data.convergentNorms = ["Click to add convergent norms..."];
      if (data.divergentNorms.length === 0) data.divergentNorms = ["Click to add divergent norms..."];

      console.log("Final parsed IoA data:", data);
      return data;
    };

    if (value) {
      setIslandData(parseMarkdown(value));
    } else {
      // If no value is provided, set default data
      const defaultData = {
        contestedFacts: ["Click to add contested facts..."],
        agreedFacts: ["Click to add agreed facts..."],
        convergentNorms: ["Click to add convergent norms..."],
        divergentNorms: ["Click to add divergent norms..."]
      };
      console.log("No value provided, using default data:", defaultData);
      setIslandData(defaultData);
    }
  }, [value]);

  // Convert island data back to markdown format
  const updateMarkdown = (newData: IslandData) => {
    const markdown = `# Island of Agreements

## Contested Facts
${newData.contestedFacts.map(fact => `- ${fact}`).join('\n')}

## Agreed Facts
${newData.agreedFacts.map(fact => `- ${fact}`).join('\n')}

## Convergent Norms
${newData.convergentNorms.map(norm => `- ${norm}`).join('\n')}

## Divergent Norms
${newData.divergentNorms.map(norm => `- ${norm}`).join('\n')}
`;
    console.log("Updating markdown:", markdown);
    onChange(markdown);
  };

  // Format cell content as bullet points
  const formatContentAsList = (items: string[]) => {
    return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  };

  // Handle content updates from editable cells
  const handleContentUpdate = (
    section: keyof IslandData,
    content: string
  ) => {
    const newData = { ...islandData };
    
    // Split by lines and filter empty lines
    const items = content
      .split(/\n|<br>|<div>|<\/div>/)
      .map(line => line.replace(/<\/?[^>]+(>|$)/g, '').trim())
      .filter(line => line.length > 0);
    
    // Ensure we always have at least one item
    if (items.length === 0) {
      items.push(`Click to add ${section}...`);
    }
    
    newData[section] = items;
    setIslandData(newData);
    updateMarkdown(newData);
  };

  return (
    <TableWrapper>
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <HeaderCell>Contested Facts</HeaderCell>
              <HeaderCell>Agreed Facts</HeaderCell>
              <HeaderCell>Convergent Norms</HeaderCell>
              <HeaderCell>Divergent Norms</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <ContentCell 
                sx={{ backgroundColor: '#ffebee' }} // light red
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.contestedFacts)
                }}
                onBlur={(e) => handleContentUpdate('contestedFacts', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e8f5e9' }} // light green
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.agreedFacts)
                }}
                onBlur={(e) => handleContentUpdate('agreedFacts', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e3f2fd' }} // light blue
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.convergentNorms)
                }}
                onBlur={(e) => handleContentUpdate('convergentNorms', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#fff3e0' }} // light orange
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.divergentNorms)
                }}
                onBlur={(e) => handleContentUpdate('divergentNorms', e.currentTarget.innerText)}
              />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Contested Facts:</strong> Facts that need to be clarified with factual evidence
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Agreed Facts:</strong> Points of agreement to start the dialogue
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Convergent Norms:</strong> Points to be underlined as convergent values
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Divergent Norms:</strong> Points of divergence on norms to be negotiated
        </Typography>
      </Box>
    </TableWrapper>
  );
};

export default IslandOfAgreementsTable; 