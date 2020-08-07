import React from 'react';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import GitHubIcon from '@material-ui/icons/GitHub';
import Grid from '@material-ui/core/Grid';

function Description() {
  return (
    <Grid container direction="row" justify="space-between" alignItems="center">
      <Grid item>
        <Typography variant="body1">
          <strong>Avivator</strong>
        </Typography>
      </Grid>
      <Grid item>
        <IconButton
          href="https://github.com/hms-dbmi/viv"
          aria-label="GitHub Repository"
          disableRipple
        >
          <GitHubIcon />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default Description;
