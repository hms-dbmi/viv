import React from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

import { MAX_CHANNELS } from '../../../constants';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore,
  useImageSettingsStore
} from '../../../state';
import { getSingleSelectionStats } from '../../../utils';

const AddChannel = () => {
  const {
    globalSelection,
    isViewerLoading,
    use3d,
    setIsChannelLoading,
    addIsChannelLoading
  } = useViewerStore();
  const { loader, selections } = useChannelSettings();
  const { addChannel, setPropertiesForChannel } = useChannelSetters();
  const { setImageSetting } = useImageSettingsStore();
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
      setImageSetting('onViewportLoad', () => {
        setPropertiesForChannel(
          numSelectionsBeforeAdd,
          ['domains', 'sliders', 'isOn'],
          [domain, slider, true]
        );
        setImageSetting('onViewportLoad', () => {});
        setIsChannelLoading(numSelectionsBeforeAdd, false);
      });
      addIsChannelLoading(true);
      addChannel(
        ['selections', 'ids', 'isOn'],
        [selection, String(Math.random()), false]
      );
    });
  };
  return (
    <Button
      disabled={selections.length === MAX_CHANNELS || isViewerLoading}
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
