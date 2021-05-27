import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const ZoomLockToggle = () => {
  const { toggleZoomLock, zoomLock } = useImageSettingsStore();
  const { isViewerLoading } = useViewerStore();
  return (
    <Button
      disabled={isViewerLoading}
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
