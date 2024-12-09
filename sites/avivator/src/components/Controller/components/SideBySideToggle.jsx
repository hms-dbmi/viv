import Button from '@mui/material/Button';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const SideBySideToggle = () => {
  const isOverviewOn = useImageSettingsStore(store => store.isOverviewOn);
  const [isViewerLoading, toggleUseLinkedView, useLinkedView, use3d] =
    useViewerStore(
      useShallow(store => [
        store.isViewerLoading,
        store.toggleUseLinkedView,
        store.useLinkedView,
        store.use3d
      ])
    );
  return (
    <Button
      disabled={isViewerLoading || isOverviewOn || use3d}
      onClick={toggleUseLinkedView}
      variant="outlined"
      size="small"
      fullWidth
    >
      {useLinkedView ? 'Hide' : 'Show'} Side-by-Side
    </Button>
  );
};
export default SideBySideToggle;
