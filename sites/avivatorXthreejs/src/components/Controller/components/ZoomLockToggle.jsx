import React from 'react';
import Button from '@material-ui/core/Button';
import shallow from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const ZoomLockToggle = () => {
  const [toggleZoomLock, zoomLock] = useImageSettingsStore(
    store => [store.toggleZoomLock, store.zoomLock],
    shallow
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
