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
import { useChannelSettings, useViewerStore } from '../../state';
import { guessRgb, useWindowSize, getNameFromUrl } from '../../utils';
import { GLOBAL_SLIDER_DIMENSION_FIELDS } from '../../constants';

const Controller = () => {
  const { loader, selections, ids, colormap } = useChannelSettings();
  const {
    metadata,
    channelOptions,
    useLinkedView,
    use3d,
    useColormap,
    useLens,
    source,
    isLoading
  } = useViewerStore();
  const viewSize = useWindowSize();
  const isRgb = metadata && guessRgb(metadata);
  const globalControlDimensions =
    loader[0] &&
    loader[0].labels?.filter(dimension =>
      GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dimension.field)
    );
  const channelControllers = ids.map((id, i) => {
    const name = channelOptions[selections[i].c];
    return (
      <Grid
        key={`channel-controller-${name}-${id}`}
        style={{ width: '100%' }}
        item
      >
        <ChannelController
          name={name}
          index={i}
          channelOptions={channelOptions}
          shouldShowPixelValue={!useLinkedView}
        />
      </Grid>
    );
  });
  const globalControllers =
    globalControlDimensions &&
    globalControlDimensions.map(dimension => {
      // Only return a slider if there is a "stack."
      return dimension.values.length > 1 && !use3d ? (
        <GlobalSelectionSlider key={dimension.field} dimension={dimension} />
      ) : null;
    });
  return (
    <Menu maxHeight={viewSize.height}>
      {useColormap && <ColormapSelect />}
      {use3d && <RenderingModeSelect />}
      {useLens && !colormap && (
        <LensSelect
          channelOptions={selections.map(sel => channelOptions[sel.c])}
        />
      )}
      {globalControllers}
      {!isLoading && !isRgb ? (
        <Grid container>{channelControllers}</Grid>
      ) : (
        <Grid container justify="center">
          {!isRgb && <CircularProgress />}
        </Grid>
      )}
      {!isRgb && <AddChannel />}
      {loader.length > 0 &&
        loader[0].shape[loader[0].labels.indexOf('z')] > 1 && <VolumeButton />}
      {!use3d && <PictureInPictureToggle />}
      {!use3d && <SideBySideToggle />}
      {useLinkedView && (
        <>
          <ZoomLockToggle />
          <PanLockToggle />
        </>
      )}
      {use3d && <Slicer />}
    </Menu>
  );
};
export default Controller;
