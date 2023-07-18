import React from 'react';
import Button from '@material-ui/core/Button';
import shallow from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PictureInPictureToggle = () => {
  const [isOverviewOn, toggleIsOverviewOn] = useImageSettingsStore(
    store => [store.isOverviewOn, store.toggleIsOverviewOn],
    shallow
  );
  const [isViewerLoading, useLinkedView, use3d] = useViewerStore(
    store => [store.isViewerLoading, store.useLinkedView, store.use3d],
    shallow
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
