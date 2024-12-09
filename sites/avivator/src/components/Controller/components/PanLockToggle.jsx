import Button from '@mui/material/Button';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PanLockToggle = () => {
  const [togglePanLock, panLock] = useImageSettingsStore(
    useShallow(store => [store.togglePanLock, store.panLock])
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
