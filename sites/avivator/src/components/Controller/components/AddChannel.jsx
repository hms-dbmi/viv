import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import React, { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

import { COLOR_PALLETE, MAX_CHANNELS } from '../../../constants';
import {
  useChannelsStore,
  useImageSettingsStore,
  useLoader,
  useMetadata,
  useViewerStore
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
    useShallow(store => [
      store.globalSelection,
      store.isViewerLoading,
      store.use3d,
      store.setIsChannelLoading,
      store.addIsChannelLoading
    ])
  );
  const [selections, addChannel, setPropertiesForChannel] = useChannelsStore(
    useShallow(store => [
      store.selections,
      store.addChannel,
      store.setPropertiesForChannel
    ])
  );
  const loader = useLoader();
  const metadata = useMetadata();
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
      const {
        Pixels: { Channels }
      } = metadata;
      const { c } = selection;
      addChannel({
        selections: selection,
        ids: String(Math.random()),
        channelsVisible: false,
        colors:
          Channels[c].Color?.slice(0, -1) ??
          (COLOR_PALLETE[c] || [255, 255, 255])
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
    setPropertiesForChannel,
    metadata
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
