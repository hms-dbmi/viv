import React from 'react';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import GitHubIcon from '@material-ui/icons/GitHub';
import Grid from '@material-ui/core/Grid';
import CloseIcon from '@material-ui/icons/Close';
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
    <Grid container direction="row" justifyContent="flex-end" alignItems="center">
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
