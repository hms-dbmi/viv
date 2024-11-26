import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import React from 'react';

import { COLORMAP_OPTIONS } from '../../../constants';
import { useImageSettingsStore, useViewerStore } from '../../../state';

function ColormapSelect() {
  const colormap = useImageSettingsStore(store => store.colormap);
  const isViewerLoading = useViewerStore(store => store.isViewerLoading);
  return (
    <FormControl fullWidth variant="standard">
      <InputLabel htmlFor="colormap-select" size="small">
        Additive {colormap === '' ? ' Blending' : 'Color Mapping'}
      </InputLabel>
      <Select
        size="small"
        native
        onChange={e =>
          useImageSettingsStore.setState({ colormap: e.target.value })
        }
        value={colormap}
        inputProps={{
          name: 'colormap',
          id: 'colormap-select'
        }}
        disabled={isViewerLoading}
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
