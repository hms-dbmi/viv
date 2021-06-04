import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';

import {
  useChannelSettings,
  useImageSettingsStore,
  useViewerStore
} from '../../../state';

function LensSelect() {
  const { selections } = useChannelSettings();
  const {
    setImageSetting,
    isLensOn,
    toggleIsLensOn,
    lensSelection
  } = useImageSettingsStore();
  const { channelOptions } = useViewerStore();
  const currChannelIndices = selections.map(sel => sel.c);

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
          {currChannelIndices.map((channelIndex, relativeIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <option
              key={channelOptions[channelIndex] + String(relativeIndex)}
              value={relativeIndex}
            >
              {channelOptions[channelIndex]}
            </option>
          ))}
        </Select>
      </Grid>
    </Grid>
  );
}

export default LensSelect;
