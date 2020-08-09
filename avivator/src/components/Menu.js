import React, { useState, useReducer, useRef } from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import InfoIcon from '@material-ui/icons/Info';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Typography from '@material-ui/core/Typography';
import Popper from '@material-ui/core/Popper';
import { makeStyles } from '@material-ui/core/styles';
import Description from './Description';

const useStyles = makeStyles(theme => ({
  root: {
    maxHeight: props => `${props.maxHeight - theme.spacing(4)}px`,
    width: '350px',
    overflowY: 'auto'
  },
  typography: {
    fontSize: '.8rem'
  },
  paper: {
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 2
  },
  item: {
    width: '100%'
  },
  divider: {
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(2)
  }
}));

function Header(props) {
  const { handleSubmitNewUrl, url } = props;
  const [text, setText] = useState(url);
  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles(props);

  return (
    <Grid container direction="column">
      <Grid item xs={12}>
        <Description />
      </Grid>
      <Grid
        container
        direction="row"
        justify="space-between"
        alignItems="center"
      >
        <Grid item xs={1}>
          <InfoIcon onClick={toggle} ref={anchorRef} />
          <Popper
            open={open}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            style={{ width: '25%' }}
          >
            <Paper style={{ padding: 8 }}>
              <ClickAwayListener onClickAway={toggle}>
                <Typography className={classes.typography}>
                  Provide a URL to an OME-TIFF file or a Bio-Formats Zarr store
                  to view the image. View the
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="http://viv.gehlenborglab.org"
                  >
                    docs
                  </a>
                  to learn more about the supported file formats.
                </Typography>
              </ClickAwayListener>
            </Paper>
          </Popper>
        </Grid>
        <Grid item xs={11}>
          <form
            onSubmit={event => {
              handleSubmitNewUrl(event, text);
              setText('');
            }}
          >
            <TextField
              id="standard-basic"
              label="OME-TIFF/Bioformats-Zarr URL"
              variant="filled"
              size="small"
              fullWidth
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </form>
        </Grid>
      </Grid>
      <Grid item xs={12} className={classes.divider}>
        <Divider />
      </Grid>
    </Grid>
  );
}

function Menu({ children, ...props }) {
  const classes = useStyles(props);
  return (
    <Box position="absolute" right={0} top={0} m={1} className={classes.root}>
      <Paper className={classes.paper}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <Header {...props} />
        <Grid
          container
          direction="column"
          spacing={1}
          justify="center"
          alignItems="center"
        >
          {children.map((child, i) => {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Grid item key={i} className={classes.item}>
                {child}
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}

export default Menu;
