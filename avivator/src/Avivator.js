import React, { useEffect } from 'react';

import { useViewerStore } from './state';
import { initImage } from './hooks';
import SnackBars from './components/Snackbars';
import Viewer from './components/Viewer';
import Controller from './components/Controller';
import DropzoneWrapper from './components/DropzoneWrapper';

import './index.css';

/**
 * This component serves as batteries-included visualization for OME-compliant tiff or zarr images.
 * This includes color sliders, selectors, and more.
 * @param {Object} props
 * @param {Object} props.history A React router history object to create new urls (optional).
 * @param {Object} args.sources A list of sources for a dropdown menu, like [{ url, description }]
 * */
export default function Avivator(props) {
  const { history, source: initSource, isDemoImage } = props;
  const { isLoading, setViewerState, source } = useViewerStore();

  useEffect(() => {
    setViewerState('source', initSource);
    setViewerState('isNoImageUrlSnackbarOn', isDemoImage);
  }, []);
  initImage(source, history);
  return (
    <>
      <DropzoneWrapper>{!isLoading && <Viewer />}</DropzoneWrapper>
      <Controller />
      <SnackBars />
    </>
  );
}
