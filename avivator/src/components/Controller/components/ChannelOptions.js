import React, { useReducer, useRef } from 'react';
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import { makeStyles } from '@material-ui/core/styles';

import { useChannelSetters } from '../../../state';

import ColorPalette from './ColorPalette';

const useStyles = makeStyles(() => ({
  paper: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  },
  span: {
    width: '70px',
    textAlign: 'center',
    paddingLeft: '2px',
    paddingRight: '2px'
  },
  colors: {
    '&:hover': {
      backgroundColor: 'transparent'
    },
    paddingLeft: '2px',
    paddingRight: '2px'
  }
}));

function ChannelOptions({ index }) {
  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const { removeChannel } = useChannelSetters();

  const handleRemoveChannel = () => removeChannel(index);

  const classes = useStyles();
  return (
    <>
      <IconButton
        aria-label="Remove channel"
        size="small"
        onClick={toggle}
        ref={anchorRef}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end">
        <Paper className={classes.paper}>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id="channel-options">
              <MenuItem dense disableGutters onClick={handleRemoveChannel}>
                <span className={classes.span}>Remove</span>
              </MenuItem>
              <MenuItem dense disableGutters className={classes.colors}>
                <ColorPalette />
              </MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

export default ChannelOptions;
