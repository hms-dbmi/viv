import React from 'react';
import { useDropzone } from '../hooks';

export default function DropzoneWrapper({ children }) {
  const { getRootProps, getInputProps } = useDropzone();

  return (
    <div {...getRootProps({ onClick: event => event.stopPropagation() })}>
      <input {...getInputProps()} />
      {children}
    </div>
  );
}
