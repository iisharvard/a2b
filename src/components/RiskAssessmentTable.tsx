import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  TextField,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { RiskAssessment } from '../store/negotiationSlice';

interface RiskAssessmentTableProps {
  riskAssessment: RiskAssessment[];
  scenarioId: string;
  onAddAssessment: (assessment: RiskAssessment) => void;
  onUpdateAssessment: (assessment: RiskAssessment) => void;
  onDeleteAssessment: (assessmentId: string) => void;
  viewMode?: 'short-term' | 'long-term' | 'full';
}

const riskLevels = ['Low', 'Medium-Low', 'Medium', 'Medium-High', 'High'];

const RiskAssessmentTable = ({ 
  riskAssessment, 
  scenarioId, 
  onAddAssessment, 
  onUpdateAssessment, 
  onDeleteAssessment,
  viewMode = 'full'
}: RiskAssessmentTableProps) => {
  const [category, setCategory] = useState('');
  const [shortTermImpact, setShortTermImpact] = useState('');
  const [shortTermMitigation, setShortTermMitigation] = useState('');
  const [shortTermRiskAfter, setShortTermRiskAfter] = useState('Medium');
  const [longTermImpact, setLongTermImpact] = useState('');
  const [longTermMitigation, setLongTermMitigation] = useState('');
  const [longTermRiskAfter, setLongTermRiskAfter] = useState('Medium');
  const [overallAssessment, setOverallAssessment] = useState('');

  const filteredAssessments = riskAssessment.filter(
    (assessment) => assessment.scenarioId === scenarioId
  );

  const handleAddAssessment = () => {
    if (!category) return;

    const newAssessment: RiskAssessment = {
      id: Date.now().toString(),
      scenarioId,
      category,
      shortTermImpact,
      shortTermMitigation,
      shortTermRiskAfter,
      longTermImpact,
      longTermMitigation,
      longTermRiskAfter,
      overallAssessment,
    };

    onAddAssessment(newAssessment);

    // Reset form
    setCategory('');
    setShortTermImpact('');
    setShortTermMitigation('');
    setShortTermRiskAfter('Medium');
    setLongTermImpact('');
    setLongTermMitigation('');
    setLongTermRiskAfter('Medium');
    setOverallAssessment('');
  };

  const handleUpdateField = (
    assessmentId: string,
    field: keyof RiskAssessment,
    value: string
  ) => {
    const assessment = riskAssessment.find((a) => a.id === assessmentId);
    if (!assessment) return;

    const updatedAssessment = {
      ...assessment,
      [field]: value,
    };

    onUpdateAssessment(updatedAssessment);
  };

  // Render the short-term risk assessment table
  const renderShortTermTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Impact</TableCell>
            <TableCell>Mitigation</TableCell>
            <TableCell>Risk After</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAssessments.map((assessment) => (
            <TableRow key={assessment.id}>
              <TableCell>
                <TextField
                  value={assessment.category}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'category', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.shortTermImpact}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermImpact', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.shortTermMitigation}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermMitigation', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  select
                  value={assessment.shortTermRiskAfter}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermRiskAfter', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                >
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => onDeleteAssessment(assessment.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Short-Term Impact"
                value={shortTermImpact}
                onChange={(e) => setShortTermImpact(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Short-Term Mitigation"
                value={shortTermMitigation}
                onChange={(e) => setShortTermMitigation(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                select
                label="Risk After"
                value={shortTermRiskAfter}
                onChange={(e) => setShortTermRiskAfter(e.target.value)}
                fullWidth
                variant="standard"
              >
                {riskLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </TableCell>
            <TableCell>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddAssessment}
                disabled={!category}
              >
                Add
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render the long-term risk assessment table
  const renderLongTermTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Impact</TableCell>
            <TableCell>Mitigation</TableCell>
            <TableCell>Risk After</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAssessments.map((assessment) => (
            <TableRow key={assessment.id}>
              <TableCell>
                <TextField
                  value={assessment.category}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'category', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.longTermImpact}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermImpact', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.longTermMitigation}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermMitigation', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  select
                  value={assessment.longTermRiskAfter}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermRiskAfter', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                >
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => onDeleteAssessment(assessment.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Long-Term Impact"
                value={longTermImpact}
                onChange={(e) => setLongTermImpact(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Long-Term Mitigation"
                value={longTermMitigation}
                onChange={(e) => setLongTermMitigation(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                select
                label="Risk After"
                value={longTermRiskAfter}
                onChange={(e) => setLongTermRiskAfter(e.target.value)}
                fullWidth
                variant="standard"
              >
                {riskLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </TableCell>
            <TableCell>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddAssessment}
                disabled={!category}
              >
                Add
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render the full risk assessment table (original implementation)
  const renderFullTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Short-Term Impact</TableCell>
            <TableCell>Short-Term Mitigation</TableCell>
            <TableCell>Risk After</TableCell>
            <TableCell>Long-Term Impact</TableCell>
            <TableCell>Long-Term Mitigation</TableCell>
            <TableCell>Risk After</TableCell>
            <TableCell>Overall Assessment</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAssessments.map((assessment) => (
            <TableRow key={assessment.id}>
              <TableCell>
                <TextField
                  value={assessment.category}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'category', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.shortTermImpact}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermImpact', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.shortTermMitigation}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermMitigation', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  select
                  value={assessment.shortTermRiskAfter}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'shortTermRiskAfter', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                >
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.longTermImpact}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermImpact', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.longTermMitigation}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermMitigation', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <TextField
                  select
                  value={assessment.longTermRiskAfter}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'longTermRiskAfter', e.target.value)
                  }
                  fullWidth
                  variant="standard"
                >
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  value={assessment.overallAssessment}
                  onChange={(e) =>
                    handleUpdateField(assessment.id, 'overallAssessment', e.target.value)
                  }
                  fullWidth
                  multiline
                  variant="standard"
                />
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => onDeleteAssessment(assessment.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Short-Term Impact"
                value={shortTermImpact}
                onChange={(e) => setShortTermImpact(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Short-Term Mitigation"
                value={shortTermMitigation}
                onChange={(e) => setShortTermMitigation(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                select
                label="Risk After"
                value={shortTermRiskAfter}
                onChange={(e) => setShortTermRiskAfter(e.target.value)}
                fullWidth
                variant="standard"
              >
                {riskLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </TableCell>
            <TableCell>
              <TextField
                label="Long-Term Impact"
                value={longTermImpact}
                onChange={(e) => setLongTermImpact(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                label="Long-Term Mitigation"
                value={longTermMitigation}
                onChange={(e) => setLongTermMitigation(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <TextField
                select
                label="Risk After"
                value={longTermRiskAfter}
                onChange={(e) => setLongTermRiskAfter(e.target.value)}
                fullWidth
                variant="standard"
              >
                {riskLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </TableCell>
            <TableCell>
              <TextField
                label="Overall Assessment"
                value={overallAssessment}
                onChange={(e) => setOverallAssessment(e.target.value)}
                fullWidth
                multiline
                variant="standard"
              />
            </TableCell>
            <TableCell>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddAssessment}
                disabled={!category}
              >
                Add
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render the appropriate table based on viewMode
  return (
    <Box>
      {viewMode === 'short-term' && renderShortTermTable()}
      {viewMode === 'long-term' && renderLongTermTable()}
      {viewMode === 'full' && renderFullTable()}
    </Box>
  );
};

export default RiskAssessmentTable; 