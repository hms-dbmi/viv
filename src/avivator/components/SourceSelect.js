import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';

function SourceSelect({ value, handleChange, disabled, sources }) {
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
        {sources.map(({ url, description }, i) => {
          return (
            <option key={url} value={i}>
              {description}
            </option>
          );
        })}
      </Select>
    </FormControl>
  );
}

export default SourceSelect;
