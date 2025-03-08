import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { RiskAssessment } from '../store/negotiationSlice';
import { DataTable, Column } from './common/DataTable';

const riskLevels = ['Low', 'Medium-Low', 'Medium', 'Medium-High', 'High'];

interface RiskAssessmentTableProps {
  assessments: RiskAssessment[];
  scenarioId: string;
  viewMode: 'view' | 'edit';
  onAddAssessment: (assessment: RiskAssessment) => void;
  onUpdateAssessment: (assessment: RiskAssessment) => void;
  onDeleteAssessment: (assessmentId: string) => void;
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
  scenarioId,
  viewMode,
  onAddAssessment,
  onUpdateAssessment,
  onDeleteAssessment,
}) => {
  const filteredAssessments = assessments.filter(a => a.scenarioId === scenarioId);

  const handleAddNew = () => {
    onAddAssessment({
      id: Date.now().toString(),
      scenarioId,
      category: 'New Risk Category',
      shortTermImpact: '',
      shortTermMitigation: '',
      shortTermRiskAfter: 'Medium',
      longTermImpact: '',
      longTermMitigation: '',
      longTermRiskAfter: 'Medium',
      overallAssessment: ''
    });
  };

  const handleUpdate = (item: RiskAssessment, field: string, value: any) => {
    onUpdateAssessment({
      ...item,
      [field]: value
    });
  };

  const baseColumns = [
    { id: 'category', label: 'Risk Category', minWidth: 170, editable: viewMode === 'edit' }
  ];

  const shortTermColumns: Column<RiskAssessment>[] = [
    ...baseColumns,
    { id: 'shortTermImpact', label: 'Short-term Impact', minWidth: 200, editable: viewMode === 'edit' },
    { id: 'shortTermMitigation', label: 'Short-term Mitigation', minWidth: 200, editable: viewMode === 'edit' },
    {
      id: 'shortTermRiskAfter',
      label: 'Risk Level After Mitigation',
      minWidth: 170,
      editable: viewMode === 'edit',
      type: 'select',
      options: riskLevels,
    },
  ];

  const longTermColumns: Column<RiskAssessment>[] = [
    ...baseColumns,
    { id: 'longTermImpact', label: 'Long-term Impact', minWidth: 200, editable: viewMode === 'edit' },
    { id: 'longTermMitigation', label: 'Long-term Mitigation', minWidth: 200, editable: viewMode === 'edit' },
    {
      id: 'longTermRiskAfter',
      label: 'Risk Level After Mitigation',
      minWidth: 170,
      editable: viewMode === 'edit',
      type: 'select',
      options: riskLevels,
    },
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
        title="Short-term Risk Assessment"
        columns={shortTermColumns}
        data={filteredAssessments}
        onUpdate={handleUpdate}
        onDelete={assessment => onDeleteAssessment(assessment.id)}
        getRowId={assessment => assessment.id}
      />

      <Box sx={{ mt: 4 }}>
        <TableSection
          title="Long-term Risk Assessment"
          columns={longTermColumns}
          data={filteredAssessments}
          onUpdate={handleUpdate}
          onDelete={assessment => onDeleteAssessment(assessment.id)}
          getRowId={assessment => assessment.id}
        />
      </Box>
    </Box>
  );
};

export default RiskAssessmentTable; 