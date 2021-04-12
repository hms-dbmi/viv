import React from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

import { MAX_CHANNELS } from '../../../constants';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore
} from '../../../state';

const AddChannel = () => {
  const { globalSelection, isLoading } = useViewerStore();
  const { loader, selections } = useChannelSettings();
  const { addChannel } = useChannelSetters();
  const handleChannelAdd = async () => {
    const selection = {};
    const { labels } = loader[0];
    labels.forEach(l => {
      selection[l] = 0;
    });
    addChannel(['selections'], [{ ...selection, ...globalSelection }]);
  };
  return (
    <Button
      disabled={selections.length === MAX_CHANNELS || isLoading}
      onClick={handleChannelAdd}
      fullWidth
      variant="outlined"
      style={{ borderStyle: 'dashed' }}
      startIcon={<AddIcon />}
      size="small"
    >
      Add Channel
    </Button>
  );
};
export default AddChannel;
