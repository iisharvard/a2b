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
  styled,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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

const SectionBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#f5f5f5',
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
  whatToPrioritize: string[];
  whatToAvoid: string[];
}

const IslandOfAgreementsTable: React.FC<IslandOfAgreementsTableProps> = ({ value, onChange }) => {
  const [islandData, setIslandData] = useState<IslandData>({
    contestedFacts: [],
    agreedFacts: [],
    convergentNorms: [],
    divergentNorms: [],
    whatToPrioritize: [],
    whatToAvoid: []
  });
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);

  const handleGuidanceChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setGuidanceExpanded(isExpanded);
  };

  // Parse the markdown content when it changes
  useEffect(() => {
    const parseMarkdown = (markdown: string) => {
      const data: IslandData = {
        contestedFacts: [],
        agreedFacts: [],
        convergentNorms: [],
        divergentNorms: [],
        whatToPrioritize: [],
        whatToAvoid: []
      };

      // Simple parser for the markdown format
      const lines = markdown.split('\n');
      let currentSection = '';

      for (const line of lines) {
        // Detect section headings
        if (line.match(/^## Contested Facts/i)) {
          currentSection = 'contestedFacts';
          continue;
        } else if (line.match(/^## Agreed Facts/i)) {
          currentSection = 'agreedFacts';
          continue;
        } else if (line.match(/^## Convergent Norms/i)) {
          currentSection = 'convergentNorms';
          continue;
        } else if (line.match(/^## Divergent Norms/i)) {
          currentSection = 'divergentNorms';
          continue;
        } else if (line.match(/^## What to Prioritize/i)) {
          currentSection = 'whatToPrioritize';
          continue;
        } else if (line.match(/^## What to Avoid/i)) {
          currentSection = 'whatToAvoid';
          continue;
        }

        // Extract bullet points
        if (line.trim().startsWith('- ') && currentSection) {
          const item = line.trim().substring(2).trim();
          if (item) {
            data[currentSection as keyof IslandData].push(item);
          }
        }
      }

      // Ensure there's at least one item in each section
      if (data.contestedFacts.length === 0) data.contestedFacts = ["Click to add contested facts..."];
      if (data.agreedFacts.length === 0) data.agreedFacts = ["Click to add agreed facts..."];
      if (data.convergentNorms.length === 0) data.convergentNorms = ["Click to add convergent norms..."];
      if (data.divergentNorms.length === 0) data.divergentNorms = ["Click to add divergent norms..."];
      if (data.whatToPrioritize.length === 0) data.whatToPrioritize = ["Click to add priorities..."];
      if (data.whatToAvoid.length === 0) data.whatToAvoid = ["Click to add items to avoid..."];

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
        divergentNorms: ["Click to add divergent norms..."],
        whatToPrioritize: ["Click to add priorities..."],
        whatToAvoid: ["Click to add items to avoid..."]
      };
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

## What to Prioritize
${newData.whatToPrioritize.map(item => `- ${item}`).join('\n')}

## What to Avoid
${newData.whatToAvoid.map(item => `- ${item}`).join('\n')}
`;
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
      <Typography variant="h5" gutterBottom>
        Island of Agreements
      </Typography>
      
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <HeaderCell sx={{ backgroundColor: '#ef5350', color: 'white' }}>Contested Facts</HeaderCell>
              <HeaderCell sx={{ backgroundColor: '#66bb6a', color: 'white' }}>Agreed Facts</HeaderCell>
              <HeaderCell sx={{ backgroundColor: '#66bb6a', color: 'white' }}>Convergent Norms</HeaderCell>
              <HeaderCell sx={{ backgroundColor: '#ef5350', color: 'white' }}>Divergent Norms</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <ContentCell 
                sx={{ backgroundColor: '#ffebee' }} // light red for contested facts
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.contestedFacts)
                }}
                onBlur={(e) => handleContentUpdate('contestedFacts', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e8f5e9' }} // light green for agreed facts
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.agreedFacts)
                }}
                onBlur={(e) => handleContentUpdate('agreedFacts', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#e8f5e9' }} // same light green for convergent norms
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ 
                  __html: formatContentAsList(islandData.convergentNorms)
                }}
                onBlur={(e) => handleContentUpdate('convergentNorms', e.currentTarget.innerText)}
              />
              <ContentCell 
                sx={{ backgroundColor: '#ffebee' }} // same light red for divergent norms
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
      
      <Box sx={{ mt: 3 }}>
        <Accordion expanded={guidanceExpanded} onChange={handleGuidanceChange}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="negotiation-guidance-content"
            id="negotiation-guidance-header"
          >
            <Typography variant="h6">Negotiation Guidance</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  What to Prioritize
                </Typography>
                <SectionBox
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ 
                    __html: formatContentAsList(islandData.whatToPrioritize)
                  }}
                  onBlur={(e) => handleContentUpdate('whatToPrioritize', e.currentTarget.innerText)}
                  sx={{ backgroundColor: '#e3f2fd' }} // light blue for priorities
                />
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  What to Avoid
                </Typography>
                <SectionBox
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ 
                    __html: formatContentAsList(islandData.whatToAvoid)
                  }}
                  onBlur={(e) => handleContentUpdate('whatToAvoid', e.currentTarget.innerText)}
                  sx={{ backgroundColor: '#fce4ec' }} // light pink for things to avoid
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
      
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
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