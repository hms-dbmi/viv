import React, { useCallback } from 'react';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import shallow from 'zustand/shallow';

import { MAX_CHANNELS, COLOR_PALLETE } from '../../../constants';
import {
  useChannelsStore,
  useViewerStore,
  useImageSettingsStore,
  useLoader,
  useMetadata
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
          (Channels[c].Color && Channels[c].Color.slice(0, -1)) ??
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
