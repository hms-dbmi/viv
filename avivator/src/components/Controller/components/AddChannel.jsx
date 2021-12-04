import React from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import shallow from 'zustand/shallow';

import { MAX_CHANNELS } from '../../../constants';
import {
  useChannelsStore,
  useViewerStore,
  useImageSettingsStore
} from '../../../state';
import { getSingleSelectionStats } from '../../../utils';

const AddChannel = () => {
  const [
    globalSelection,
    isViewerLoading,
    use3d,
    setIsChannelLoading,
    addIsChannelLoading
  ] = useViewerStore(
    store => [
      store.globalSelection,
      store.isViewerLoading,
      store.use3d,
      store.setIsChannelLoading,
      store.addIsChannelLoading
    ],
    shallow
  );
  const [
    loader,
    selections,
    addChannel,
    setPropertiesForChannel
  ] = useChannelsStore(
    store => [
      store.loader,
      store.selections,
      store.addChannel,
      store.setPropertiesForChannel
    ],
    shallow
  );
  const { labels } = loader[0];
  const handleChannelAdd = () => {
    let selection = Object.fromEntries(labels.map(l => [l, 0]));
    selection = { ...selection, ...globalSelection };
    const numSelectionsBeforeAdd = selections.length;
    getSingleSelectionStats({
      loader,
      selection,
      use3d
    }).then(({ domain, contrastLimits }) => {
      useImageSettingsStore.setState({
        onViewportLoad: () => {
          setPropertiesForChannel(numSelectionsBeforeAdd, {
            domains: domain,
            contrastLimits,
            channelsVisible: true
          });
          useImageSettingsStore.setState({ onViewportLoad: () => {} });
          setIsChannelLoading(numSelectionsBeforeAdd, false);
        }
      });
      addIsChannelLoading(true);
      addChannel({
        selections: selection,
        ids: String(Math.random()),
        channelsVisible: false
      });
    });
  };
  return (
    <Button
      disabled={selections.length === MAX_CHANNELS || isViewerLoading}
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
