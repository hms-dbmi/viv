import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import LensIcon from '@material-ui/icons/Lens';

import { makeStyles } from '@material-ui/core/styles';

import { COLOR_PALLETE } from '../../../constants';

const useStyles = makeStyles(() => ({
  container: {
    width: '70px',
    height: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  button: {
    padding: '3px',
    width: '16px',
    height: '16px'
  },
  icon: {
    width: '17px',
    height: '17px'
  }
}));

const ColorPalette = ({ handleColorSelect }) => {
  const classes = useStyles();
  return (
    <div className={classes.container} aria-label="color-swatch">
      {COLOR_PALLETE.map(color => {
        return (
          <IconButton
            className={classes.button}
            key={color}
            onClick={() => handleColorSelect(color)}
          >
            <LensIcon
              fontSize="small"
              style={{ color: `rgb(${color})` }}
              className={classes.icon}
            />
          </IconButton>
        );
      })}
    </div>
  );
};

export default ColorPalette;
