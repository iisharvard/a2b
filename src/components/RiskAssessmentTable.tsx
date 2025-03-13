import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RiskAssessment } from '../store/negotiationSlice';

interface RiskAssessmentTableProps {
  assessments: RiskAssessment[];
  scenarioId?: string;
  viewMode?: 'view' | 'edit';
  onAddAssessment?: (assessment: RiskAssessment) => void;
  onUpdateAssessment?: (assessment: RiskAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

const RiskAssessmentTable: React.FC<RiskAssessmentTableProps> = ({
  assessments,
  scenarioId = '',
  viewMode = 'view',
  onAddAssessment,
  onUpdateAssessment,
  onDeleteAssessment
}) => {
  const filteredAssessments = scenarioId 
    ? assessments.filter(a => a.scenarioId === scenarioId) 
    : assessments;

  // If no assessments, show a message
  if (filteredAssessments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No risk assessment available.
        </Typography>
      </Box>
    );
  }

  // Get the first assessment (we typically only have one per scenario)
  const assessment = filteredAssessments[0];

  return (
    <Box>
      {/* Short Term and Long Term Impact Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Short Term Impact
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold', width: '30%' }}>
                      Impact
                    </TableCell>
                    <TableCell>
                      {assessment.shortTermImpact || 'Not specified'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                      Mitigation Strategy
                    </TableCell>
                    <TableCell>
                      {assessment.shortTermMitigation || 'Not specified'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                      Risk After Mitigation
                    </TableCell>
                    <TableCell>
                      {assessment.shortTermRiskAfterMitigation || 'Not specified'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Long Term Impact
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold', width: '30%' }}>
                      Impact
                    </TableCell>
                    <TableCell>
                      {assessment.longTermImpact || 'Not specified'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                      Mitigation Strategy
                    </TableCell>
                    <TableCell>
                      {assessment.longTermMitigation || 'Not specified'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                      Risk After Mitigation
                    </TableCell>
                    <TableCell>
                      {assessment.longTermRiskAfterMitigation || 'Not specified'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Overall Assessment Section */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overall Assessment
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Security of Field Teams</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.securityAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Relationship with Counterpart</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.relationshipAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Leverage of Counterpart</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.leverageAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Impact on Other Organizations/Actors</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.organizationsImpactAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Beneficiaries/Communities</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.beneficiariesAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Reputation</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {assessment.reputationAssessment || 'Not specified'}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Legacy Format Support (if needed) */}
      {assessment.type && assessment.description && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Legacy Risk Assessment
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Likelihood</TableCell>
                  <TableCell>Impact</TableCell>
                  <TableCell>Mitigation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{assessment.type}</TableCell>
                  <TableCell>{assessment.description}</TableCell>
                  <TableCell>{assessment.likelihood}/5</TableCell>
                  <TableCell>{assessment.impact}/5</TableCell>
                  <TableCell>{assessment.mitigation}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default RiskAssessmentTable; 