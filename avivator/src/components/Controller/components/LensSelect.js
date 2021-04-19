import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';

import { useImageSettingsStore, useViewerStore } from '../../../state';

function LensSelect() {
  const {
    setImageSetting,
    isLensOn,
    toggleIsLensOn,
    lensSelection
  } = useImageSettingsStore();
  const { channelOptions } = useViewerStore();

  const checkboxColor = `rgb(${[255, 255, 255]})`;
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center">
      <Grid item xs={2}>
        Lens:
      </Grid>
      <Grid item xs={2}>
        <Checkbox
          onChange={toggleIsLensOn}
          checked={isLensOn}
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
          onChange={e => setImageSetting({ lensSelection: e.target.value })}
        >
          {channelOptions.map((opt, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <option key={opt + i} value={i}>
              {opt}
            </option>
          ))}
        </Select>
      </Grid>
    </Grid>
  );
}

export default LensSelect;
