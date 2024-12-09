import Button from '@mui/material/Button';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PictureInPictureToggle = () => {
  const [isOverviewOn, toggleIsOverviewOn] = useImageSettingsStore(
    useShallow(store => [store.isOverviewOn, store.toggleIsOverviewOn])
  );
  const [isViewerLoading, useLinkedView, use3d] = useViewerStore(
    useShallow(store => [
      store.isViewerLoading,
      store.useLinkedView,
      store.use3d
    ])
  );
  return (
    <Button
      disabled={isViewerLoading || useLinkedView || use3d}
      onClick={toggleIsOverviewOn}
      variant="outlined"
      size="small"
      fullWidth
    >
      {isOverviewOn ? 'Hide' : 'Show'} Picture-In-Picture
    </Button>
  );
};
export default PictureInPictureToggle;
