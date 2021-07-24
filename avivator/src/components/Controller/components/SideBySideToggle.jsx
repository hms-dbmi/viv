import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const SideBySideToggle = () => {
  const { isOverviewOn } = useImageSettingsStore();
  const {
    isViewerLoading,
    toggleUseLinkedView,
    useLinkedView,
    use3d
  } = useViewerStore();
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
