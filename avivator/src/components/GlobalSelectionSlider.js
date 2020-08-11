import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';

export default function GlobalSelectionSlider(props) {
  const {
    dimension: { field, values },
    globalSelections,
    handleGlobalChannelsSelectionChange
  } = props;
  return (
    <Grid container direction="row" justify="space-between" alignItems="center">
      <Grid item xs={1}>
        {field}:
      </Grid>
      <Grid item xs={11}>
        <Slider
          value={globalSelections[field]}
          // See https://github.com/hms-dbmi/viv/issues/176 for why
          // we have the two handlers.
          onChange={(event, newValue) => {
            handleGlobalChannelsSelectionChange({
              selection: { [field]: newValue },
              event
            });
          }}
          onChangeCommitted={(event, newValue) => {
            handleGlobalChannelsSelectionChange({
              selection: { [field]: newValue },
              event
            });
          }}
          valueLabelDisplay="auto"
          getAriaLabel={() => `${field} slider`}
          marks={values.map(val => ({ value: val }))}
          min={Number(values[0])}
          max={Number(values.slice(-1))}
          orientation="horizontal"
          style={{ marginTop: '7px' }}
          step={null}
        />
      </Grid>
    </Grid>
  );
}
