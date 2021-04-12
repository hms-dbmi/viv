import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const PictureInPictureToggle = () => {
  const { isOverviewOn, toggleIsOverviewOn } = useImageSettingsStore();
  const { isLoading, useLinkedView } = useViewerStore();
  return (
    <Button
      disabled={isLoading || useLinkedView}
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
