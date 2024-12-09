import React from 'react';

import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useShallow } from 'zustand/shallow';

import {
  useChannelsStore,
  useImageSettingsStore,
  useViewerStore
} from '../../../state';

function LensSelect() {
  const selections = useChannelsStore(store => store.selections);
  const [lensEnabled, toggleLensEnabled, lensSelection] = useImageSettingsStore(
    useShallow(store => [
      store.lensEnabled,
      store.toggleLensEnabled,
      store.lensSelection
    ])
  );
  const channelOptions = useViewerStore(store => store.channelOptions);
  const currChannelIndices = selections.map(sel => sel.c);

  const checkboxColor = `rgb(${[255, 255, 255]})`;
  return (
    <Grid
      container
      direction="row"
      sx={{
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}
    >
      <Grid item size={2}>
        Lens:
      </Grid>
      <Grid item size={2}>
        <Checkbox
          onChange={toggleLensEnabled}
          checked={lensEnabled}
          style={{
            color: checkboxColor,
            '&$checked': {
              color: checkboxColor
            }
          }}
        />
      </Grid>
      <Grid item size={8}>
        <FormControl variant="standard">
          <Select
            size="small"
            value={lensSelection}
            onChange={e =>
              useImageSettingsStore.setState({
                lensSelection: Number.parseInt(e.target.value)
              })
            }
          >
            {currChannelIndices.map((channelIndex, relativeIndex) => (
              <MenuItem
                key={channelOptions[channelIndex] + String(relativeIndex)}
                value={relativeIndex}
              >
                {channelOptions[channelIndex]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}

export default LensSelect;
