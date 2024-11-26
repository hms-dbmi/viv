import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import { Select } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import makeStyles from '@mui/styles/makeStyles';
import React, { useState, useReducer, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { useChannelsStore, useViewerStore } from '../../../state';
import { getNameFromUrl, isMobileOrTablet } from '../../../utils';
import DropzoneButton from './DropzoneButton';
import MenuTitle from './MenuTitle';

const useStyles = makeStyles(theme => ({
  root: {
    maxHeight: props => `${props.maxHeight - theme.spacing(4)}`,
    width: '365px',
    overflowX: 'hidden',
    overflowY: 'scroll',
    '&::-webkit-scrollbar': {
      display: 'none',
      background: 'transparent'
    },
    scrollbarWidth: 'none'
  },
  typography: {
    fontSize: '.8rem'
  },
  paper: {
    paddingBottom: theme.spacing(2),
    paddingRight: theme.spacing(2),
    paddingLeft: theme.spacing(2),
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
  const image = useChannelsStore(store => store.image);
  const [source, metadata] = useViewerStore(
    useShallow(store => [store.source, store.metadata])
  );
  const handleSubmitNewUrl = (event, newUrl) => {
    event.preventDefault();
    const newSource = {
      urlOrFile: newUrl,
      // Use the trailing part of the URL (file name, presumably) as the description.
      description: getNameFromUrl(newUrl)
    };
    useViewerStore.setState({ source: newSource });
  };
  const onImageSelectionChange = e =>
    useChannelsStore.setState({
      image: e.target.value
    });
  const url = typeof source.urlOrFile === 'string' ? source.urlOrFile : '';
  const [text, setText] = useState(url);
  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles(props);

  useEffect(() => setText(url), [url]);

  return (
    <Grid container direction="column" spacing={0}>
      <Grid item size={12}>
        <MenuTitle />
      </Grid>
      <Grid
        container
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Grid item size={1}>
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
                  to view the image. View the{' '}
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href="http://viv.gehlenborglab.org"
                  >
                    docs
                  </Link>{' '}
                  to learn more about the supported file formats.
                </Typography>
              </ClickAwayListener>
            </Paper>
          </Popper>
        </Grid>
        <Grid item size={11}>
          <form
            onSubmit={event => {
              handleSubmitNewUrl(event, text);
            }}
          >
            <TextField
              id="ome-input"
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
      {!isMobileOrTablet() && (
        <Grid item size={12} style={{ paddingTop: 16 }}>
          <DropzoneButton />
        </Grid>
      )}
      {Array.isArray(metadata) && (
        <Grid item size={12}>
          <Select native value={image} onChange={onImageSelectionChange}>
            {metadata.map((meta, i) => (
              <option key={meta.Name} value={i}>
                {meta.Name}
              </option>
            ))}
          </Select>
        </Grid>
      )}
      <Grid item size={12} className={classes.divider}>
        <Divider />
      </Grid>
    </Grid>
  );
}

function Menu({ children, ...props }) {
  const classes = useStyles(props);
  const [isControllerOn, toggleIsControllerOn] = useViewerStore(
    useShallow(store => [store.isControllerOn, store.toggleIsControllerOn])
  );
  return isControllerOn ? (
    <Box
      className={classes.root}
      sx={{
        position: 'absolute',
        right: 0,
        top: 0,
        m: 1
      }}
    >
      <Paper className={classes.paper}>
        <Header />
        <Grid
          container
          direction="column"
          sx={{
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {children.map((child, i) => {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: Ignore carried over from eslint without description.
              <Grid item key={i} className={classes.item}>
                {child}
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  ) : (
    <Box
      sx={{
        position: 'absolute',
        right: -8,
        top: -8,
        m: 2
      }}
    >
      <Button
        variant="outlined"
        size="small"
        endIcon={<SettingsIcon />}
        onClick={toggleIsControllerOn}
        aria-label="show-menu"
      >
        AVIVATOR
      </Button>
    </Box>
  );
}

export default Menu;
