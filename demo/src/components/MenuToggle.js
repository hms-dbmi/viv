import React from 'react';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';

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
      <RemoveIcon fontSize="small" />
    </IconButton>
  );

  const ShowButton = (
    <Button
      variant="outlined"
      color="default"
      size="small"
      endIcon={<AddIcon />}
      onClick={toggle}
      aria-label="show-menu"
    >
      Show Menu
    </Button>
  );
  return on ? HideButton : ShowButton;
}

export default MenuToggle;
