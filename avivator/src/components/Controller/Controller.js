import React from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';

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
      setPropertiesForChannel(i, { selections: selection });
      getSingleSelectionStats({
        loader,
        selection,
        use3d
      }).then(({ domain, slider }) => {
        setImageSetting('onViewportLoad', () => {
          setPropertiesForChannel(i, { sliders: slider, domains: domain });
          setImageSetting('onViewportLoad', () => {});
          setIsChannelLoading(i, false);
        });
        setPropertiesForChannel(i, { selections: selection });
      });
    };
    const toggleIsOn = () => toggleIsOnSetter(i);
    const handleSliderChange = (e, v) =>
      setPropertiesForChannel(i, { sliders: v });
    const handleRemoveChannel = () => removeChannel(i);
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
    return size > 1 && !use3d ? (
      <GlobalSelectionSlider key={label} size={size} label={label} />
    ) : null;
  });
  return (
    <Menu maxHeight={viewSize.height}>
      {useColormap && <ColormapSelect />}
      {use3d && <RenderingModeSelect />}
      {useLens && !colormap && shape[labels.indexOf('c')] > 1 && (
        <LensSelect
          channelOptions={selections.map(sel => channelOptions[sel.c])}
        />
      )}
      {globalControllers}
      {use3d && <Slicer />}
      {use3d && <CameraOptions />}
      {!isViewerLoading && !isRgb ? (
        <Grid container>{channelControllers}</Grid>
      ) : (
        <Grid container justify="center">
          {!isRgb && <CircularProgress />}
        </Grid>
      )}
      {!isRgb && <AddChannel />}
      {shape[labels.indexOf('z')] > 1 && <VolumeButton />}
      {!use3d && <PictureInPictureToggle />}
      {!use3d && <SideBySideToggle />}
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
