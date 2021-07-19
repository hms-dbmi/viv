import React, { useState } from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Divider from '@material-ui/core/Divider';

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';
import VolumeButton from './components/VolumeButton';
import RenderingModeSelect from './components/RenderingModeSelect';
import Slicer from './components/Slicer';
import AddChannel from './components/AddChannel';
import PanLockToggle from './components/PanLockToggle';
import ZoomLockToggle from './components/ZoomLockToggle';
import SideBySideToggle from './components/SideBySideToggle';
import PictureInPictureToggle from './components/PictureInPictureToggle';
import CameraOptions from './components/CameraOptions';
import {
  useChannelSettings,
  useViewerStore,
  useImageSettingsStore,
  useChannelSetters
} from '../../state';
import { guessRgb, useWindowSize, getSingleSelectionStats } from '../../utils';
import { GLOBAL_SLIDER_DIMENSION_FIELDS } from '../../constants';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const Controller = () => {
  const {
    isOn,
    sliders,
    colors,
    domains,
    selections,
    loader,
    ids
  } = useChannelSettings();
  const {
    setPropertiesForChannel,
    toggleIsOn: toggleIsOnSetter,
    removeChannel
  } = useChannelSetters();
  const { colormap, setImageSetting } = useImageSettingsStore();
  const {
    metadata,
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
  } = useViewerStore();
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
      }).then(({ domain, slider }) => {
        setImageSetting({
          onViewportLoad: () => {
            setPropertiesForChannel(i, { sliders: slider, domains: domain });
            setImageSetting({ onViewportLoad: () => {} });
            setIsChannelLoading(i, false);
          }
        });
        setPropertiesForChannel(i, { selections: selection });
      });
    };
    const toggleIsOn = () => toggleIsOnSetter(i);
    const handleSliderChange = (e, v) =>
      setPropertiesForChannel(i, { sliders: v });
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
          isOn={isOn[i]}
          pixelValue={pixelValues[i]}
          toggleIsOn={toggleIsOn}
          handleSliderChange={handleSliderChange}
          domain={domains[i]}
          slider={sliders[i]}
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
        aria-label="simple tabs example"
        style={{ height: '24px', minHeight: '24px' }}
      >
        <Tab label="Channels" style={{ fontSize: '.75rem', bottom: 12 }} />
        <Tab label="Volume" style={{ fontSize: '.75rem', bottom: 12 }} />
      </Tabs>
      <Divider />
      <TabPanel value={tab} index={0}>
        {useColormap && <ColormapSelect />}
        {useLens && !colormap && shape[labels.indexOf('c')] > 1 && (
          <LensSelect
            channelOptions={selections.map(sel => channelOptions[sel.c])}
          />
        )}
        {!use3d && globalControllers}
        {!isViewerLoading && !isRgb ? (
          <Grid container>{channelControllers}</Grid>
        ) : (
          <Grid container justify="center">
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
