/* eslint-disable no-nested-ternary */
import React from 'react';
import debounce from 'lodash/debounce';
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
  const { useLinkedView, setViewerState, use3d, viewState } = useViewerStore();
  const {
    colors,
    contrastLimits,
    active,
    selections,
    loader
  } = useChannelSettings();
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
    isOverviewOn,
    onViewportLoad,
    useFixedAxis
  } = useImageSettingsStore();
  return use3d ? (
    <VolumeViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      active={active}
      selections={selections}
      colormap={colormap.length > 0 && colormap}
      xSlice={xSlice}
      ySlice={ySlice}
      zSlice={zSlice}
      resolution={resolution}
      renderingMode={renderingMode}
      height={viewSize.height}
      width={viewSize.width}
      onViewportLoad={onViewportLoad}
      useFixedAxis={useFixedAxis}
      viewStates={[viewState]}
      onViewStateChange={debounce(
        ({ viewState: newViewState, viewId }) =>
          setViewerState({ viewState: { ...newViewState, id: viewId } }),
        250,
        { trailing: true }
      )}
    />
  ) : useLinkedView ? (
    <SideBySideViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      active={active}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      colormap={colormap.length > 0 && colormap}
      zoomLock={zoomLock}
      panLock={panLock}
      hoverHooks={{
        handleValue: v => setViewerState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
      onViewportLoad={onViewportLoad}
    />
  ) : (
    <PictureInPictureViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      active={active}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      colormap={colormap.length > 0 && colormap}
      overview={DEFAULT_OVERVIEW}
      overviewOn={isOverviewOn}
      hoverHooks={{
        handleValue: v => setViewerState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
      onViewportLoad={onViewportLoad}
    />
  );
};
export default Viewer;
