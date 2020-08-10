import React from 'react';

import Link from '@material-ui/core/Link';

export function OffsetsWarning() {
  return (
    <>
      A lot of channels but have been detected in the requested OME-TIFF. To
      learn how to speed up load times by providing byte offsets, refer to the
      first point{' '}
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href="http://viv.gehlenborglab.org/#ome-tiff-loading"
      >
        here
      </Link>{' '}
      and then place the offsets.json adjacent to the OME-TIFF wherever hosted.
    </>
  );
}

export function LoaderError() {
  return (
    <>
      Something has gone wrong loading your image. Please refer to the{' '}
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
