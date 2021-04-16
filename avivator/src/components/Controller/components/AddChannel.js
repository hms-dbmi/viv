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
  const {
    globalSelection,
    isLoading,
    use3d,
    setViewerState
  } = useViewerStore();
  const { loader, selections } = useChannelSettings();
  const { addChannel, setPropertiesForChannel } = useChannelSetters();
  const handleChannelAdd = () => {
    let selection = {};
    const { labels } = loader[0];
    labels.forEach(l => {
      selection[l] = 0;
    });
    selection = { ...selection, ...globalSelection };
    const numSelectionsBeforeAdd = selections.length;
    getSingleSelectionStats({
      loader,
      selection,
      use3d
    }).then(({ domain, slider }) => {
      setViewerState('onViewportLoad', () => {
        setPropertiesForChannel(
          numSelectionsBeforeAdd,
          ['domains', 'sliders'],
          [domain, slider]
        );
        setViewerState('onViewportLoad', () => {});
      });
      addChannel(['selections', 'ids'], [selection, String(Math.random())]);
    });
  };
  return (
    <Button
      disabled={selections.length === MAX_CHANNELS || isLoading}
      onClick={handleChannelAdd}
      fullWidth
      variant="outlined"
      style={{ borderStyle: 'dashed', marginBottom: 8 }}
      startIcon={<AddIcon />}
      size="small"
    >
      Add Channel
    </Button>
  );
};
export default AddChannel;
