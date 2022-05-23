import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import shallow from 'zustand/shallow';

import { MAX_CHANNELS } from '../../../constants';
import {
  useChannelsStore,
  useViewerStore,
  useImageSettingsStore,
  useLoader
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
  const [selections, addChannel, setPropertiesForChannel] = useChannelsStore(
    store => [
      store.selections,
      store.addChannel,
      store.setPropertiesForChannel
    ],
    shallow
  );
  const loader = useLoader();
  const { labels } = loader[0];
  const handleChannelAdd = useCallback(() => {
    let selection = Object.fromEntries(labels.map(l => [l, 0]));
    selection = { ...selection, ...globalSelection };
    const numSelectionsBeforeAdd = selections.length;
    getSingleSelectionStats({
      loader,
      selection,
      use3d
    }).then(({ domain, contrastLimits }) => {
      setPropertiesForChannel(numSelectionsBeforeAdd, {
        domains: domain,
        contrastLimits,
        channelsVisible: true
      });
      useImageSettingsStore.setState({
        onViewportLoad: () => {
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
  }, [
    labels,
    loader,
    globalSelection,
    use3d,
    addChannel,
    addIsChannelLoading,
    selections,
    setIsChannelLoading,
    setPropertiesForChannel
  ]);
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
