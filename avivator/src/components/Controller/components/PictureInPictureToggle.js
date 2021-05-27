import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PictureInPictureToggle = () => {
  const { isOverviewOn, toggleIsOverviewOn } = useImageSettingsStore();
  const { isViewerLoading, useLinkedView, use3d } = useViewerStore();
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
