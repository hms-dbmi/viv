/* eslint-disable no-nested-ternary */
import React from 'react';
import { Plane } from '@math.gl/culling';
import {
  SideBySideViewer,
  PictureInPictureViewer,
  VolumeViewer
  // eslint-disable-next-line import/no-unresolved
} from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useViewerStore,
  useChannelSettings
} from '../state';
import { useWindowSize } from '../utils';
import { DEFAULT_OVERVIEW } from '../constants';

const Viewer = () => {
  const { useLinkedView, setViewerState, use3d } = useViewerStore();
  const { colors, sliders, isOn, selections, loader } = useChannelSettings();
  const viewSize = useWindowSize();
  const {
    lensSelection,
    colormap,
    renderingMode,
    sphericals,
    isNormalPositive,
    resolution,
    isLensOn,
    zoomLock,
    panLock,
    isOverviewOn
  } = useImageSettingsStore();
  const clippingPlanes = sphericals.map(v =>
    new Plane().fromPointNormal(
      v.toVector3(),
      v.toVector3().scale(isNormalPositive ? 1 : -1)
    )
  );
  return use3d ? (
    <VolumeViewer
      loader={loader}
      sliderValues={sliders}
      colorValues={colors}
      channelIsOn={isOn}
      loaderSelection={selections}
      colormap={colormap.length > 0 && colormap}
      clippingPlanes={clippingPlanes}
      resolution={resolution}
      renderingMode={renderingMode}
      height={viewSize.height}
      width={viewSize.width}
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
