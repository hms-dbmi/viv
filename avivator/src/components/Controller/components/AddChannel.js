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
  const { addChannel, setPropertyForChannel } = useChannelSetters();
  const handleChannelAdd = async () => {
    let selection = {};
    const { labels } = loader[0];
    labels.forEach(l => {
      selection[l] = 0;
    });
    selection = { ...selection, ...globalSelection };
    const numSelectionsBeforeAdd = selections.length;
    addChannel(['selections', 'ids'], [selection, String(Math.random())]);
    getSingleSelectionStats({
      loader,
      selection,
      use3d
    }).then(({ domain, slider }) =>
      setPropertyForChannel(
        numSelectionsBeforeAdd,
        ['domains', 'sliders'],
        [domain, slider]
      )
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
