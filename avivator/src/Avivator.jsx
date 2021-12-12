import React, { useEffect } from 'react';

import { useViewerStore } from './state';
import { useImage } from './hooks';
import SnackBars from './components/Snackbars';
import Viewer from './components/Viewer';
import Controller from './components/Controller';
import DropzoneWrapper from './components/DropzoneWrapper';
import Footer from './components/Footer';

import './index.css';

/**
 * This component serves as batteries-included visualization for OME-compliant tiff or zarr images.
 * This includes color contrastLimits, selectors, and more.
 * @param {Object} props
 * @param {Object} props.history A React router history object to create new urls (optional).
 * @param {Object} args.sources A list of sources for a dropdown menu, like [{ url, description }]
 * */
export default function Avivator(props) {
  const { history, source: initSource, isDemoImage } = props;
  const isViewerLoading = useViewerStore(store => store.isViewerLoading);
  const source = useViewerStore(store => store.source);
  const useLinkedView = useViewerStore(store => store.useLinkedView);

  useEffect(() => {
    useViewerStore.setState({
      source: initSource,
      isNoImageUrlSnackbarOn: isDemoImage
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useImage(source, history);
  return (
    <>
      <DropzoneWrapper>{!isViewerLoading && <Viewer />}</DropzoneWrapper>
      <Controller />
      <SnackBars />
      {!useLinkedView && <Footer />}
    </>
  );
}
