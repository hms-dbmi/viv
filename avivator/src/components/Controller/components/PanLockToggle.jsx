import React from 'react';
import Button from '@material-ui/core/Button';
import shallow from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PanLockToggle = () => {
  const [togglePanLock, panLock] = useImageSettingsStore(
    store => [store.togglePanLock, store.panLock],
    shallow
  );
  const isViewerLoading = useViewerStore(store => store.isViewerLoading);
  return (
    <Button
      disabled={isViewerLoading}
      onClick={togglePanLock}
      variant="outlined"
      size="small"
      fullWidth
    >
      {panLock ? 'Unlock' : 'Lock'} Pan
    </Button>
  );
};
export default PanLockToggle;
