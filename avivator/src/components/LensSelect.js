import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';

function LensSelect({
  isOn,
  handleToggle,
  handleSelection,
  channelOptions,
  lensSelection
}) {
  const checkboxColor = `rgb(${[255, 255, 255]})`;
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center">
      <Grid item xs={2}>
        Lens:
      </Grid>
      <Grid item xs={2}>
        <Checkbox
          onChange={handleToggle}
          checked={isOn}
          style={{
            color: checkboxColor,
            '&$checked': {
              color: checkboxColor
            }
          }}
        />
      </Grid>
      <Grid item xs={7}>
        <Select
          native
          value={lensSelection}
          onChange={e => handleSelection(e.target.value)}
        >
          {channelOptions.map((opt, i) => (
            <option key={opt} value={i}>
              {opt}
            </option>
          ))}
        </Select>
      </Grid>
    </Grid>
  );
}

export default LensSelect;
