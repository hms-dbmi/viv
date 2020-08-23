import React from 'react';
import { useDropzone } from 'react-dropzone';
import Button from '@material-ui/core/Button';

export function DropzoneButton({ handleSubmitFile }) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleSubmitFile
  });

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
      /* eslint-disable-next-line react/jsx-props-no-spreading */
      {...getRootProps()}
    >
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <input {...getInputProps({ accept: '.tif, .tiff' })} />
      Choose a file
    </Button>
  );
}

export function DropzoneWrapper({ handleSubmitFile, children }) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleSubmitFile
  });

  return (
    <div
      /* eslint-disable-next-line react/jsx-props-no-spreading */
      {...getRootProps({ onClick: event => event.stopPropagation() })}
    >
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <input {...getInputProps()} />
      {children}
    </div>
  );
}
