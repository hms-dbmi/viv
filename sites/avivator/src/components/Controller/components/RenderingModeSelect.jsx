import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import shallow from 'zustand/shallow';

import { RENDERING_MODES } from '@hms-dbmi/viv';
import { useImageSettingsStore, useImageSettingsStoreApi, useViewerStore } from '../../../state';

const renderingOptions = Object.values(RENDERING_MODES);

function RenderingModeSelect() {
  const renderingMode = useImageSettingsStore(store => store.renderingMode);
  const [isViewerLoading, use3d] = useViewerStore(
    store => [store.isViewerLoading, store.use3d],
    shallow
  );
  // Empty option allows for displaying the title of the dropdown fully in the UI.
  const options = !use3d ? [...renderingOptions, ''] : renderingOptions;
  const imageSettingsStore = useImageSettingsStoreApi();
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="rendering-mode-select">Rendering Mode</InputLabel>
      <Select
        native
        onChange={e =>
          imageSettingsStore.setState({ renderingMode: e.target.value })
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
