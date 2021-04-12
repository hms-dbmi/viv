import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';

import { RENDERING_MODES } from '../../../dist'; // eslint-disable-line import/extensions,import/no-unresolved

import { useImageSettingsStore, useViewerStore } from '../state';

function RenderingModeSelect() {
  const { setImageSetting, renderingMode } = useImageSettingsStore();
  const { isLoading } = useViewerStore();
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="rendering-mode-select">Rendering Mode</InputLabel>
      <Select
        native
        onChange={e => setImageSetting('renderingMode', e.target.value)}
        value={renderingMode}
        inputProps={{
          name: 'rendering-mode',
          id: 'rendering-mode-select'
        }}
        disabled={isLoading}
      >
        {Object.values(RENDERING_MODES).map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

export default RenderingModeSelect;
