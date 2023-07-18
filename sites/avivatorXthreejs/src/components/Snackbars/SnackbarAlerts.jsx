import React from 'react';

import Link from '@material-ui/core/Link';

export function OffsetsWarning() {
  return (
    <>
      Avivator could not find an IFD index for the requested OME-TIFF, and
      therefore longer latencies are expected. Please read our documentation on
      &quot;Indexed TIFF&quot; to generate an IFD index for your OME-TIFF and
      improve initial load times.
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href="http://viv.gehlenborglab.org/#data-preparation"
      >
        in this section of our documentation
      </Link>{' '}
      and then place the offsets.json adjacent to the OME-TIFF wherever hosted.
    </>
  );
}

export function LoaderError({ message }) {
  return (
    <>
      {message
        ? `The following error was thrown: "${message}". `
        : 'Something has gone wrong loading your image. '}
      Please refer to the{' '}
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href="http://viv.gehlenborglab.org"
      >
        docs
      </Link>{' '}
      for information about supported file formats.
    </>
  );
}

export function NoImageUrlInfo() {
  return (
    <>
      You are seeing a random demo image because no image URL was provided. To
      view your own images, enter a URL into the &quot;OME-TIFF/Bioformats-Zarr
      URL&quot; field. See the{' '}
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href="http://viv.gehlenborglab.org"
      >
        docs
      </Link>{' '}
      for details on how to prepare your images for viewing with Avivator.
    </>
  );
}

export function VolumeRenderingWarning() {
  return (
    <>
      Volume rendering is only available on browsers that support WebGL2. If you
      are using Safari, you can turn on WebGL2 by navigating in the top menubar
      to check Develop &gt; Experimental Features &gt; WebGL 2.0 and then
      refreshing the page.
    </>
  );
}
