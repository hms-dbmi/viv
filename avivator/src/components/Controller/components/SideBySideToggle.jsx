import React from 'react';
import Button from '@material-ui/core/Button';
import shallow from 'zustand/shallow';

import { useImageSettingsStore, useViewerStore } from '../../../state';

const SideBySideToggle = () => {
  const isOverviewOn = useImageSettingsStore(store => store.isOverviewOn);
  const [
    isViewerLoading,
    toggleUseLinkedView,
    useLinkedView,
    use3d
  ] = useViewerStore(
    store => [
      store.isViewerLoading,
      store.toggleUseLinkedView,
      store.useLinkedView,
      store.use3d
    ],
    shallow
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
