import React, { useReducer, useRef } from 'react';
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';

import { makeStyles } from '@material-ui/core/styles';

import { DEFAULT_COLOR_PALLETE } from '../utils';

const useStyles = makeStyles(theme => ({
  paper: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  },
  colorRow: {
    width: '70px',
    height: '40px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  colorBlock: {
    width: '15px',
    height: '15px',
    borderStyle: 'solid rgba(0, 0, 0, 0.75)'
  },
  menu: {
    width: '70px',
    textAlign: 'center'
  }
}));

const ColorPalette = ({ handleChange }) => {
  const classes = useStyles();
  return (
    <div className={classes.colorRow}>
      {DEFAULT_COLOR_PALLETE.map(color => {
        return (
          <div
            className={classes.colorBlock}
            style={{ backgroundColor: `rgb(${color})` }}
            key={color}
            onClick={() => handleChange(color)}
          />
        );
      })}
    </div>
  );
};

// handleChange('REMOVE_CHANNEL')
function ChannelOptions({ handleChange }) {
  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles();

  const handleColorSelect = color => {
    toggle();
    handleChange('CHANGE_COLOR', color);
  };

  const handleRemove = () => {
    toggle();
    handleChange('REMOVE_CHANNEL');
  };

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
      <Popper
        open={open}
        role={undefined}
        anchorEl={anchorRef.current}
        placement="bottom-end"
      >
        <Paper className={classes.paper}>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id="channel-options">
              <MenuItem dense onClick={handleRemove}>
                <span className={classes.menu}>Remove</span>
              </MenuItem>
              <MenuItem dense>
                <ColorPalette handleChange={handleColorSelect} />
              </MenuItem>
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

export default ChannelOptions;
