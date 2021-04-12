/* eslint-disable no-nested-ternary */
import React from 'react';
import {
  useImageSettingsStore,
  useViewerStore,
  useChannelSettings
} from '../state';
import { useWindowSize } from '../utils';
import { DEFAULT_OVERVIEW } from '../constants';
import {
  SideBySideViewer,
  PictureInPictureViewer,
  VolumeViewer
} from '../../../dist'; // eslint-disable-line import/extensions,import/no-unresolved

const Viewer = () => {
  const { useLinkedView, setViewerState, use3d } = useViewerStore();
  const { colors, sliders, isOn, selections, loader } = useChannelSettings();
  const viewSize = useWindowSize();

  const {
    lensSelection,
    colormap,
    renderingMode,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    isLensOn,
    zoomLock,
    panLock,
    isOverviewOn
  } = useImageSettingsStore();
  return use3d ? (
    <VolumeViewer
      loader={loader}
      sliderValues={sliders}
      colorValues={colors}
      channelIsOn={isOn}
      loaderSelection={selections}
      colormap={colormap.length > 0 && colormap}
      xSlice={xSlice}
      ySlice={ySlice}
      zSlice={zSlice}
      resolution={resolution}
      renderingMode={renderingMode}
    />
  ) : useLinkedView ? (
    <SideBySideViewer
      loader={loader}
      sliderValues={sliders}
      colorValues={colors}
      channelIsOn={isOn}
      loaderSelection={selections}
      height={viewSize.height}
      width={viewSize.width}
      colormap={colormap.length > 0 && colormap}
      zoomLock={zoomLock}
      panLock={panLock}
      hoverHooks={{
        handleValue: v => setViewerState('pixelValues', v)
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
    />
  ) : (
    <PictureInPictureViewer
      loader={loader}
      sliderValues={sliders}
      colorValues={colors}
      channelIsOn={isOn}
      loaderSelection={selections}
      height={viewSize.height}
      width={viewSize.width}
      colormap={colormap.length > 0 && colormap}
      overview={DEFAULT_OVERVIEW}
      overviewOn={isOverviewOn}
      hoverHooks={{
        handleValue: v => setViewerState('pixelValues', v)
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
    />
  );
};
export default Viewer;
