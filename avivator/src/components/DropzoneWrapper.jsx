import React from 'react';
import { useDropzone } from '../hooks';

export default function DropzoneWrapper({ children }) {
  const { getRootProps, getInputProps } = useDropzone();

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
