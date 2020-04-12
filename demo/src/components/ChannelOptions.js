import React, { useReducer, useRef } from 'react';
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import LensIcon from '@material-ui/icons/Lens';

import { makeStyles } from '@material-ui/core/styles';

import { COLOR_PALLETE } from '../constants';

const useStyles = makeStyles(theme => ({
  paper: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  },
  colorRow: {
    width: '70px',
    height: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  colorBlock: {
    padding: '3px',
    width: '16px',
    height: '16px'
  },
  menu: {
    width: '70px',
    textAlign: 'center'
  },
  button: {
    width: '17px',
    height: '17px'
  },
  colorMenuItem: {
    '&:hover': {
      backgroundColor: 'transparent'
    },
    paddingLeft: '2px',
    paddingRight: '2px'
  },
  menuItem: {
    paddingLeft: '2px',
    paddingRight: '2px'
  }
}));

const ColorPalette = ({ handleChange }) => {
  const classes = useStyles();
  return (
    <div className={classes.colorRow} aria-label="color-swatch">
      {COLOR_PALLETE.map(color => {
        return (
          <IconButton className={classes.colorBlock}>
            <LensIcon
              fontSize="small"
              style={{ color: `rgb(${color})` }}
              key={color}
              onClick={() => handleChange(color)}
              className={classes.button}
            />
          </IconButton>
        );
      })}
    </div>
  );
};

function ChannelOptions({ handleChange }) {
  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles();

  const handleColorSelect = color => {
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
              <MenuItem dense disableGutters onClick={handleRemove}>
                <span className={classes.menu}>Remove</span>
              </MenuItem>
              <MenuItem dense disableGutters className={classes.colorMenuItem}>
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
