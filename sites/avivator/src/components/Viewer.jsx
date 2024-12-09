import {
  AdditiveColormapExtension,
  LensExtension,
  PictureInPictureViewer,
  SideBySideViewer,
  VolumeViewer
} from '@hms-dbmi/viv';
import debounce from 'lodash/debounce';
import React from 'react';
import { useShallow } from 'zustand/shallow';
import { DEFAULT_OVERVIEW } from '../constants';
import {
  useChannelsStore,
  useImageSettingsStore,
  useLoader,
  useViewerStore
} from '../state';
import { get3DExtension, useWindowSize } from '../utils';

const Viewer = () => {
  const [useLinkedView, use3d, viewState] = useViewerStore(
    useShallow(store => [store.useLinkedView, store.use3d, store.viewState])
  );
  const [colors, contrastLimits, channelsVisible, selections] =
    useChannelsStore(
      useShallow(store => [
        store.colors,
        store.contrastLimits,
        store.channelsVisible,
        store.selections
      ])
    );
  const loader = useLoader();
  const viewSize = useWindowSize();
  const [
    lensSelection,
    colormap,
    renderingMode,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    lensEnabled,
    zoomLock,
    panLock,
    isOverviewOn,
    onViewportLoad,
    useFixedAxis
  ] = useImageSettingsStore(
    useShallow(store => [
      store.lensSelection,
      store.colormap,
      store.renderingMode,
      store.xSlice,
      store.ySlice,
      store.zSlice,
      store.resolution,
      store.lensEnabled,
      store.zoomLock,
      store.panLock,
      store.isOverviewOn,
      store.onViewportLoad,
      store.useFixedAxis
    ])
  );

  const onViewStateChange = ({ viewState: { zoom } }) => {
    const z = Math.min(Math.max(Math.round(-zoom), 0), loader.length - 1);
    useViewerStore.setState({ pyramidResolution: z });
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
      extensions={[get3DExtension(colormap, renderingMode)]}
      height={viewSize.height}
      width={viewSize.width}
      onViewportLoad={onViewportLoad}
      useFixedAxis={useFixedAxis}
      viewStates={[viewState]}
      onViewStateChange={debounce(
        ({ viewState: newViewState, viewId }) =>
          useViewerStore.setState({
            viewState: { ...newViewState, id: viewId }
          }),
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
        handleValue: v => useViewerStore.setState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      lensEnabled={lensEnabled}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
      snapScaleBar
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
        handleValue: v => useViewerStore.setState({ pixelValues: v })
      }}
      lensSelection={lensSelection}
      lensEnabled={lensEnabled}
      onViewportLoad={onViewportLoad}
      extensions={[
        colormap ? new AdditiveColormapExtension() : new LensExtension()
      ]}
      colormap={colormap || 'viridis'}
      onViewStateChange={onViewStateChange}
      snapScaleBar
    />
  );
};
export default Viewer;
