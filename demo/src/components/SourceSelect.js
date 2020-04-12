import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';

import sources from '../source-info';

const SOURCE_OPTIONS = Object.keys(sources).filter(name =>
  // only use isPublic on the deployment
  // eslint-disable-next-line no-restricted-globals
  location.host === 'viv.vitessce.io' ? sources[name].isPublic : true
);

function SourceSelect({ value, handleChange, disabled }) {
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="data-source-select">Data Source</InputLabel>
      <Select
        native
        onChange={e => handleChange(e.target.value)}
        value={value}
        inputProps={{
          name: 'data-source',
          id: 'data-source-select'
        }}
        disabled={disabled}
      >
        {SOURCE_OPTIONS.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

export default SourceSelect;
