import Button from '@mui/material/Button';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const ZoomLockToggle = () => {
  const [toggleZoomLock, zoomLock] = useImageSettingsStore(
    useShallow(store => [store.toggleZoomLock, store.zoomLock])
  );
  const isViewerLoading = useViewerStore(store => store.isViewerLoading);
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
