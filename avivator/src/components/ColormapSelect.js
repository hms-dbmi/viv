import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';

import { COLORMAP_OPTIONS } from '../constants';
import { useImageSettingsStore } from '../state';

function ColormapSelect({ disabled }) {
  const { setImageSetting, colormap } = useImageSettingsStore();
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="colormap-select">
        Additive {colormap === '' ? ' Blending' : 'Color Mapping'}
      </InputLabel>
      <Select
        native
        onChange={e => setImageSetting('colormap', e.target.value)}
        value={colormap}
        inputProps={{
          name: 'colormap',
          id: 'colormap-select'
        }}
        disabled={disabled}
      >
        <option aria-label="None" value="" />
        {COLORMAP_OPTIONS.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

export default ColormapSelect;
