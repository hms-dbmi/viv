import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';

import { COLORMAP_OPTIONS } from '../../../constants';
import { useImageSettingsStore, useViewerStore } from '../../../state';

function ColormapSelect() {
  const colormap = useImageSettingsStore(store => store.colormap);
  const isViewerLoading = useViewerStore(store => store.isViewerLoading);
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="colormap-select">
        Additive {colormap === '' ? ' Blending' : 'Color Mapping'}
      </InputLabel>
      <Select
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
