import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { RENDERING_MODES } from '@hms-dbmi/viv';
import { useImageSettingsStore, useViewerStore } from '../../../state';

const renderingOptions = Object.values(RENDERING_MODES);

function RenderingModeSelect() {
  const renderingMode = useImageSettingsStore(store => store.renderingMode);
  const [isViewerLoading, use3d] = useViewerStore(
    useShallow(store => [store.isViewerLoading, store.use3d])
  );
  // Empty option allows for displaying the title of the dropdown fully in the UI.
  const options = !use3d ? [...renderingOptions, ''] : renderingOptions;
  return (
    <FormControl fullWidth variant="standard">
      <InputLabel htmlFor="rendering-mode-select" size="small">
        Rendering Mode
      </InputLabel>
      <Select
        native
        size="small"
        onChange={e =>
          useImageSettingsStore.setState({ renderingMode: e.target.value })
        }
        value={use3d ? renderingMode : ''}
        inputProps={{
          name: 'rendering-mode',
          id: 'rendering-mode-select'
        }}
        disabled={isViewerLoading || !use3d}
      >
        {options.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

export default RenderingModeSelect;
