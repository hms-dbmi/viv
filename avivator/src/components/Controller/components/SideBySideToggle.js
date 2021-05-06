import React from 'react';
import Button from '@material-ui/core/Button';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const SideBySideToggle = () => {
  const { isOverviewOn } = useImageSettingsStore();
  const {
    isViewerLoading,
    toggleUseLinkedView,
    useLinkedView
  } = useViewerStore();
  return (
    <Button
      disabled={isViewerLoading || isOverviewOn}
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
