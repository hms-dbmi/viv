import React from 'react';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import SettingsIcon from '@material-ui/icons/Settings';

const hideButtonStyle = {
  marginRight: '4.5px',
  marginTop: '3px'
};

function MenuToggle({ on, toggle }) {
  const HideButton = (
    <IconButton
      size="small"
      onClick={toggle}
      disableRipple
      aria-label="hide-menu"
      style={hideButtonStyle}
    >
      <SettingsIcon fontSize="small" />
    </IconButton>
  );

  const ShowButton = (
    <Button
      variant="outlined"
      color="default"
      size="small"
      endIcon={<SettingsIcon />}
      onClick={toggle}
      aria-label="show-menu"
    >
      AVIVATOR
    </Button>
  );
  return on ? HideButton : ShowButton;
}

export default MenuToggle;
