/* eslint-disable no-nested-ternary */
import React from 'react';
import debounce from 'lodash/debounce';
import {
  SideBySideViewer,
  PictureInPictureViewer,
  VolumeViewer,
  AdditiveColormapExtension,
  LensExtension
  // eslint-disable-next-line import/no-unresolved
} from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useViewerStore,
  useChannelSettings,
  useResolutionStore
} from '../state';
import { useWindowSize } from '../utils';
import { DEFAULT_OVERVIEW } from '../constants';

const Viewer = () => {
  const { useLinkedView, setViewerState, use3d, viewState } = useViewerStore();
  const {
    colors,
    contrastLimits,
    channelsVisible,
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

  const onViewStateChange = ({ viewState: { zoom } }) => {
    const z = Math.min(Math.max(Math.round(-zoom), 0), loader.length - 1);
    useResolutionStore.setState({ pyramidResolution: z });
  };

  return use3d ? (
    <VolumeViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      channelsVisible={channelsVisible}
      selections={selections}
      colormap={colormap}
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
      channelsVisible={channelsVisible}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      zoomLock={zoomLock}
      panLock={panLock}
      hoverHooks={{
        handleValue: v => setViewerState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
    />
  ) : (
    <PictureInPictureViewer
      loader={loader}
      contrastLimits={contrastLimits}
      colors={colors}
      channelsVisible={channelsVisible}
      selections={selections}
      height={viewSize.height}
      width={viewSize.width}
      overview={DEFAULT_OVERVIEW}
      overviewOn={isOverviewOn}
      hoverHooks={{
        handleValue: v => setViewerState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      isLensOn={isLensOn}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
      onViewStateChange={onViewStateChange}
    />
  );
};
export default Viewer;
