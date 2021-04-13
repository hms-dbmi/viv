import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import { range, getSingleSelectionStats } from '../../../utils';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore
} from '../../../state';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const { setPropertiesForChannels } = useChannelSetters();
  const { selections, loader } = useChannelSettings();
  const { setViewerState, globalSelection } = useViewerStore();
  return (
    <Grid container direction="row" justify="space-between" alignItems="center">
      <Grid item xs={1}>
        {label}:
      </Grid>
      <Grid item xs={11}>
        <Slider
          value={globalSelection[label]}
          // See https://github.com/hms-dbmi/viv/issues/176 for why
          // we have the two handlers.
          onChange={(event, newValue) => {
            setViewerState('globalSelection', {
              ...globalSelection,
              [label]: newValue
            });
          }}
          onChangeCommitted={async (event, newValue) => {
            const newSelections = [...selections].map(sel => ({
              ...sel,
              [label]: newValue
            }));
            const stats = await Promise.all(
              newSelections.map(selection =>
                getSingleSelectionStats({ loader, selection })
              )
            );
            const domains = stats.map(stat => stat.domain);
            const sliders = stats.map(stat => stat.slider);
            setPropertiesForChannels(
              range(selections.length),
              ['selections', 'domains', 'sliders'],
              [newSelections, domains, sliders]
            );
          }}
          valueLabelDisplay="auto"
          getAriaLabel={() => `${label} slider`}
          marks={range(size).map(val => ({ value: val }))}
          min={0}
          max={size}
          orientation="horizontal"
          style={{ marginTop: '7px' }}
          step={null}
        />
      </Grid>
    </Grid>
  );
}
