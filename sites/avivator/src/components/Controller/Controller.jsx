import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import React, { useState } from 'react';
import { useShallow } from 'zustand/shallow';

import { GLOBAL_SLIDER_DIMENSION_FIELDS } from '../../constants';
import {
  useChannelsStore,
  useImageSettingsStore,
  useLoader,
  useMetadata,
  useViewerStore
} from '../../state';
import { getSingleSelectionStats, guessRgb, useWindowSize } from '../../utils';
import AddChannel from './components/AddChannel';
import CameraOptions from './components/CameraOptions';
import ChannelController from './components/ChannelController';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';
import Menu from './components/Menu';
import PanLockToggle from './components/PanLockToggle';
import PictureInPictureToggle from './components/PictureInPictureToggle';
import RenderingModeSelect from './components/RenderingModeSelect';
import SideBySideToggle from './components/SideBySideToggle';
import Slicer from './components/Slicer';
import VolumeButton from './components/VolumeButton';
import ZoomLockToggle from './components/ZoomLockToggle';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const Controller = () => {
  const [
    channelsVisible,
    contrastLimits,
    colors,
    domains,
    selections,
    ids,
    setPropertiesForChannel,
    toggleIsOnSetter,
    removeChannel
  ] = useChannelsStore(
    useShallow(store => [
      store.channelsVisible,
      store.contrastLimits,
      store.colors,
      store.domains,
      store.selections,
      store.ids,
      store.setPropertiesForChannel,
      store.toggleIsOn,
      store.removeChannel
    ])
  );
  const loader = useLoader();

  const colormap = useImageSettingsStore(store => store.colormap);
  const [
    channelOptions,
    useLinkedView,
    use3d,
    useColormap,
    useLens,
    isChannelLoading,
    setIsChannelLoading,
    removeIsChannelLoading,
    pixelValues,
    isViewerLoading
  ] = useViewerStore(
    useShallow(store => [
      store.channelOptions,
      store.useLinkedView,
      store.use3d,
      store.useColormap,
      store.useLens,
      store.isChannelLoading,
      store.setIsChannelLoading,
      store.removeIsChannelLoading,
      store.pixelValues,
      store.isViewerLoading
    ])
  );
  const metadata = useMetadata();
  const viewSize = useWindowSize();
  const isRgb = metadata && guessRgb(metadata);
  const { shape, labels } = loader[0];
  const globalControlLabels = labels.filter(label =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(label)
  );
  const channelControllers = ids.map((id, i) => {
    const onSelectionChange = e => {
      const selection = {
        ...selections[i],
        c: channelOptions.indexOf(e.target.value)
      };
      setIsChannelLoading(i, true);
      getSingleSelectionStats({
        loader,
        selection,
        use3d
      }).then(({ domain, contrastLimits: newContrastLimit }) => {
        const {
          Pixels: { Channels }
        } = metadata;
        const { c } = selection;
        const newProps = {
          contrastLimits: newContrastLimit,
          domains: domain
        };
        if (Channels[c].Color) {
          newProps.colors = Channels[c].Color.slice(0, -1);
        }
        setPropertiesForChannel(i, newProps);
        useImageSettingsStore.setState({
          onViewportLoad: () => {
            useImageSettingsStore.setState({ onViewportLoad: () => {} });
            setIsChannelLoading(i, false);
          }
        });
        setPropertiesForChannel(i, { selections: selection });
      });
    };
    const toggleIsOn = () => toggleIsOnSetter(i);
    const handleSliderChange = (e, v) =>
      setPropertiesForChannel(i, { contrastLimits: v });
    const handleRemoveChannel = () => {
      removeChannel(i);
      removeIsChannelLoading(i);
    };
    const handleColorSelect = color => {
      setPropertiesForChannel(i, { colors: color });
    };
    const name = channelOptions[selections[i].c];
    return (
      <Grid
        key={`channel-controller-${name}-${id}`}
        style={{ width: '100%' }}
        item
      >
        <ChannelController
          name={name}
          onSelectionChange={onSelectionChange}
          channelsVisible={channelsVisible[i]}
          pixelValue={pixelValues[i]}
          toggleIsOn={toggleIsOn}
          handleSliderChange={handleSliderChange}
          domain={domains[i]}
          slider={contrastLimits[i]}
          color={colors[i]}
          handleRemoveChannel={handleRemoveChannel}
          handleColorSelect={handleColorSelect}
          isLoading={isChannelLoading[i]}
        />
      </Grid>
    );
  });
  const globalControllers = globalControlLabels.map(label => {
    const size = shape[labels.indexOf(label)];
    // Only return a slider if there is a "stack."
    return size > 1 ? (
      <GlobalSelectionSlider key={label} size={size} label={label} />
    ) : null;
  });
  const [tab, setTab] = useState(0);

  const handleTabChange = (event, newTab) => {
    setTab(newTab);
  };
  return (
    <Menu maxHeight={viewSize.height}>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        aria-label="tabs"
        variant="fullWidth"
        style={{ height: '24px', minHeight: '24px' }}
      >
        <Tab label="Channels" style={{ fontSize: '.75rem', bottom: 12 }} />
        <Tab label="Volume" style={{ fontSize: '.75rem', bottom: 12 }} />
      </Tabs>
      <Divider />
      <TabPanel value={tab} index={0}>
        {useColormap && <ColormapSelect />}
        {useLens && !colormap && !use3d && shape[labels.indexOf('c')] > 1 && (
          <LensSelect
            channelOptions={selections.map(sel => channelOptions[sel.c])}
          />
        )}
        {!use3d && globalControllers}
        {!isViewerLoading && !isRgb ? (
          <Grid container>{channelControllers}</Grid>
        ) : (
          <Grid
            container
            sx={{
              justifyContent: 'center'
            }}
          >
            {!isRgb && <CircularProgress />}
          </Grid>
        )}
        {!isRgb && <AddChannel />}
      </TabPanel>
      <TabPanel value={tab} index={1}>
        {<RenderingModeSelect />}
        {<Slicer />}
        {<CameraOptions />}
      </TabPanel>
      <Divider
        style={{
          marginTop: '8px',
          marginBottom: '8px'
        }}
      />
      {<VolumeButton />}
      {<PictureInPictureToggle />}
      {<SideBySideToggle />}
      {useLinkedView && !use3d && (
        <>
          <ZoomLockToggle />
          <PanLockToggle />
        </>
      )}
    </Menu>
  );
};
export default Controller;
