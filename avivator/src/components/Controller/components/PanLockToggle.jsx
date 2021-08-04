import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PanLockToggle = () => {
  const { togglePanLock, panLock } = useImageSettingsStore();
  const { isViewerLoading } = useViewerStore();
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
