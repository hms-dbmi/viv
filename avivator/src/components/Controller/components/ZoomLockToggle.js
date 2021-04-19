import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const ZoomLockToggle = () => {
  const { toggleZoomLock, zoomLock } = useImageSettingsStore();
  const { isLoading } = useViewerStore();
  return (
    <Button
      disabled={isLoading}
      onClick={toggleZoomLock}
      variant="outlined"
      size="small"
      fullWidth
    >
      {zoomLock ? 'Unlock' : 'Lock'} Zoom
    </Button>
  );
};
export default ZoomLockToggle;
