import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import React from 'react';

import { RENDERING_MODES } from '@hms-dbmi/viv';

function RenderingModeSelect({ value, handleChange, disabled }) {
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="rendering-mode-select">Rendering Mode</InputLabel>
      <Select
        native
        onChange={e => handleChange(e.target.value)}
        value={value}
        inputProps={{
          name: 'rendering-mode',
          id: 'rendering-mode-select'
        }}
        disabled={disabled}
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
