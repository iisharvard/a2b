import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export interface Column<T> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  editable?: boolean;
  type?: 'text' | 'select';
  options?: string[];
  getValue?: (item: T) => any;
  setValue?: (item: T, value: any) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onDelete?: (item: T) => void;
  onUpdate?: (item: T, field: string, value: any) => void;
  getRowId: (item: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  onDelete,
  onUpdate,
  getRowId,
}: DataTableProps<T>) {
  const handleUpdateField = (item: T, field: string, value: any) => {
    if (onUpdate) {
      onUpdate(item, field, value);
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
            {onDelete && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item) => (
            <TableRow key={getRowId(item)}>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.editable ? (
                    <TextField
                      select={column.type === 'select'}
                      value={column.getValue ? column.getValue(item) : (item as any)[column.id]}
                      onChange={(e) => handleUpdateField(item, column.id, e.target.value)}
                      fullWidth
                      variant="standard"
                    >
                      {column.type === 'select' &&
                        column.options?.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                    </TextField>
                  ) : (
                    column.format
                      ? column.format(column.getValue ? column.getValue(item) : (item as any)[column.id])
                      : column.getValue
                      ? column.getValue(item)
                      : (item as any)[column.id]
                  )}
                </TableCell>
              ))}
              {onDelete && (
                <TableCell align="right">
                  <IconButton onClick={() => onDelete(item)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 