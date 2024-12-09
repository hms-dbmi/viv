import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useViewerStore } from '../../../state';

const hideButtonStyle = {
  marginRight: '4.5px',
  marginTop: '3px'
};
function MenuTitle() {
  const toggleIsControllerOn = useViewerStore(
    store => store.toggleIsControllerOn
  );
  return (
    <Grid
      container
      direction="row"
      sx={{
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}
    >
      <Grid style={{ marginRight: 'auto' }} item>
        <Typography variant="body1">
          <strong>AVIVATOR</strong>
        </Typography>
      </Grid>
      <Grid item>
        <IconButton
          href="https://github.com/hms-dbmi/viv"
          aria-label="GitHub Repository"
          disableRipple
          size="large"
        >
          <GitHubIcon />
        </IconButton>
      </Grid>
      <Grid item>
        <IconButton
          size="small"
          onClick={toggleIsControllerOn}
          disableRipple
          aria-label="hide-menu"
          style={hideButtonStyle}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default MenuTitle;
