import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface FileUploaderProps {
  onFilesProcessed: (content: string) => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesProcessed, 
  maxFiles = 5,
  acceptedFileTypes = '.txt,.pdf,.docx,.doc,.md'
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    // Convert FileList to array and check if adding these would exceed maxFiles
    const newFiles = Array.from(fileList);
    if (files.length + newFiles.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    // Add new files to the existing files
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please upload at least one file.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Process each file and combine their contents
      const contents: string[] = [];

      for (const file of files) {
        const content = await readFileContent(file);
        contents.push(`--- File: ${file.name} ---\n\n${content}\n\n`);
      }

      // Combine all file contents
      const combinedContent = contents.join('');
      
      // Pass the combined content to the parent component
      onFilesProcessed(combinedContent);
    } catch (err) {
      console.error('Error processing files:', err);
      setError('Failed to process files. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  };

  const getFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} bytes`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Box 
          sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 3, 
            textAlign: 'center',
            mb: 2,
            bgcolor: '#f8f9fa'
          }}
        >
          <input
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Drag & Drop Files Here
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
          >
            Browse Files
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Supported formats: {acceptedFileTypes.split(',').join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Maximum {maxFiles} files
          </Typography>
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {files.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Selected Files ({files.length})
            </Typography>
            <List dense>
              {files.map((file, index) => (
                <ListItem key={index} divider={index < files.length - 1}>
                  <ListItemText 
                    primary={file.name} 
                    secondary={getFileSize(file.size)} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => removeFile(index)}
                      disabled={processing}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={processFiles}
                disabled={processing}
                startIcon={processing ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {processing ? 'Processing...' : 'Process Files'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default FileUploader; 