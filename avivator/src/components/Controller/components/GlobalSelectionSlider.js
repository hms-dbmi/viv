import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import { range, getMultiSelectionStats } from '../../../utils';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore,
  useImageSettingsStore
} from '../../../state';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const {
    setPropertiesForChannels,
    setPropertyForChannels
  } = useChannelSetters();
  const { selections, loader } = useChannelSettings();
  const { setViewerState, globalSelection } = useViewerStore();
  const { setImageSetting } = useImageSettingsStore();
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
          onChangeCommitted={(event, newValue) => {
            const newSelections = [...selections].map(sel => ({
              ...sel,
              [label]: newValue
            }));
            getMultiSelectionStats({
              loader,
              selections: newSelections,
              use3d: false
            }).then(({ domains, sliders }) => {
              setImageSetting('onViewportLoad', () => {
                setPropertiesForChannels(
                  range(newSelections.length),
                  ['domains', 'sliders'],
                  [domains, sliders]
                );
                setImageSetting('onViewportLoad', () => {});
              });
              setPropertyForChannels(
                range(newSelections.length),
                'selections',
                newSelections
              );
              setViewerState('globalSelection', {
                ...globalSelection,
                [label]: newValue
              });
            });
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
