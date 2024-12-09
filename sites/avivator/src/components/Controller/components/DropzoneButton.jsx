import Button from '@mui/material/Button';
import React from 'react';
import { useDropzone } from '../../../hooks';

export default function DropzoneButton() {
  const { getRootProps, getInputProps } = useDropzone();

  return (
    <Button
      fullWidth
      variant="outlined"
      style={{
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
        height: '2rem'
      }}
      size="small"
      {...getRootProps()}
    >
      <input {...getInputProps({ accept: '.tif, .tiff' })} />
      Choose a file
    </Button>
  );
}
