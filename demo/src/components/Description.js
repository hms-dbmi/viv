import React from 'react';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import GitHubIcon from '@material-ui/icons/GitHub';
import Grid from '@material-ui/core/Grid';
import Link from '@material-ui/core/Link';

function Description() {
  return (
    <Grid container>
      <Grid item>
        <Typography variant="body1">
          <strong>vitessce-image-viewer</strong> (&ldquo;Viv&rdquo;): A viewer
          for high bit depth, high resolution, multi-channel images using DeckGL
          over the hood and WebGL under the hood.
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body1">
          More information:
          <IconButton
            href="https://github.com/hubmapconsortium/vitessce-image-viewer"
            aria-label="Github repository"
            disableRipple
          >
            <GitHubIcon />
          </IconButton>
          <Link
            href="https://www.npmjs.com/package/@hubmap/vitessce-image-viewer"
            color="inherit"
            aria-label="NPM package"
          >
            NPM
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
}

export default Description;
