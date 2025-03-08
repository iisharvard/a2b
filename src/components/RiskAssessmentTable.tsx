import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { RiskAssessment } from '../store/negotiationSlice';
import { DataTable, Column } from './common/DataTable';

interface RiskAssessmentTableProps {
  assessments: RiskAssessment[];
  scenarioId?: string;
  viewMode?: 'view' | 'edit';
  onAddAssessment?: (assessment: RiskAssessment) => void;
  onUpdateAssessment?: (assessment: RiskAssessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

interface TableSectionProps {
  title: string;
  columns: Column<RiskAssessment>[];
  data: RiskAssessment[];
  onUpdate: (item: RiskAssessment, field: string, value: any) => void;
  onDelete: (assessment: RiskAssessment) => void;
  getRowId: (assessment: RiskAssessment) => string;
}

const TableSection: React.FC<TableSectionProps> = ({
  title,
  columns,
  data,
  onUpdate,
  onDelete,
  getRowId
}) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <DataTable
      columns={columns}
      data={data}
      onUpdate={onUpdate}
      onDelete={onDelete}
      getRowId={getRowId}
    />
  </Box>
);

const RiskAssessmentTable: React.FC<RiskAssessmentTableProps> = ({
  assessments,
  scenarioId = '',
  viewMode = 'view',
  onAddAssessment,
  onUpdateAssessment,
  onDeleteAssessment
}) => {
  const filteredAssessments = scenarioId ? assessments.filter(a => a.scenarioId === scenarioId) : assessments;

  const handleAddNew = () => {
    if (!onAddAssessment || !scenarioId) return;

    const newAssessment: RiskAssessment = {
      id: Date.now().toString(),
      scenarioId,
      type: 'short_term',
      description: '',
      likelihood: 3,
      impact: 3,
      mitigation: ''
    };
    
    onAddAssessment(newAssessment);
  };

  const handleUpdate = (item: RiskAssessment, field: string, value: any) => {
    if (!onUpdateAssessment) return;

    const updatedAssessment: RiskAssessment = { ...item };
    
    switch (field) {
      case 'likelihood':
        const likelihoodNum = Math.min(5, Math.max(1, parseInt(value, 10) || 1));
        updatedAssessment.likelihood = likelihoodNum;
        break;
      case 'impact':
        const impactNum = Math.min(5, Math.max(1, parseInt(value, 10) || 1));
        updatedAssessment.impact = impactNum;
        break;
      case 'description':
        updatedAssessment.description = value?.toString() || '';
        break;
      case 'mitigation':
        updatedAssessment.mitigation = value?.toString() || '';
        break;
      case 'type':
        if (value === 'short_term' || value === 'long_term') {
          updatedAssessment.type = value;
        } else {
          console.warn(`Invalid type value: ${value}`);
          return;
        }
        break;
      default:
        console.warn(`Unexpected field: ${field}`);
        return;
    }
    
    onUpdateAssessment(updatedAssessment);
  };

  const handleDelete = (assessment: RiskAssessment) => {
    onDeleteAssessment?.(assessment.id);
  };

  const baseColumns: Column<RiskAssessment>[] = [
    { 
      id: 'description', 
      label: 'Risk Description', 
      minWidth: 170, 
      editable: viewMode === 'edit',
      type: 'text'
    }
  ];

  const columns: Column<RiskAssessment>[] = [
    ...baseColumns,
    { 
      id: 'likelihood', 
      label: 'Likelihood (1-5)', 
      minWidth: 100, 
      editable: viewMode === 'edit',
      type: 'text',
      getValue: (item: RiskAssessment) => item.likelihood.toString(),
      format: (value: number) => `${value}/5`
    },
    { 
      id: 'impact', 
      label: 'Impact (1-5)', 
      minWidth: 100, 
      editable: viewMode === 'edit',
      type: 'text',
      getValue: (item: RiskAssessment) => item.impact.toString(),
      format: (value: number) => `${value}/5`
    },
    { 
      id: 'mitigation', 
      label: 'Mitigation Strategy', 
      minWidth: 200, 
      editable: viewMode === 'edit',
      type: 'text'
    }
  ];

  return (
    <Box>
      {viewMode === 'edit' && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddNew}
            size="small"
          >
            Add New Risk Assessment
          </Button>
        </Box>
      )}

      <TableSection
        title="Risk Assessment"
        columns={columns}
        data={filteredAssessments}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        getRowId={assessment => assessment.id}
      />
    </Box>
  );
};

export default RiskAssessmentTable; 