import React from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

import { MAX_CHANNELS } from '../../../constants';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore
} from '../../../state';
import { getSingleSelectionStats } from '../../../utils';

const AddChannel = () => {
  const { globalSelection, isLoading, use3d } = useViewerStore();
  const { loader, selections } = useChannelSettings();
  const { addChannel, setPropertiesForChannel } = useChannelSetters();
  const handleChannelAdd = () => {
    const { labels } = loader[0];
    let selection = Object.fromEntries(labels.map(l => [l, 0]));
    selection = { ...selection, ...globalSelection };
    const numSelectionsBeforeAdd = selections.length;
    addChannel({ selections: selection, ids: String(Math.random()) });
    getSingleSelectionStats({
      loader,
      selection,
      use3d
    }).then(({ domain, slider }) =>
      setPropertiesForChannel(numSelectionsBeforeAdd, {
        domains: domain,
        sliders: slider
      })
    );
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
