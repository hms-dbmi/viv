import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import debounce from 'lodash/debounce';
import { range, getMultiSelectionStats } from '../../../utils';
import {
  useChannelSettings,
  useChannelSetters,
  useViewerStore,
  useImageSettingsStore
} from '../../../state';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const { setPropertiesForChannel } = useChannelSetters();
  const { selections, loader } = useChannelSettings();
  const { setViewerState, globalSelection } = useViewerStore();
  const { setImageSetting } = useImageSettingsStore();
  const changeSelection = debounce(
    (event, newValue) => {
      setViewerState({
        isChannelLoading: selections.map(() => true)
      });
      const newSelections = [...selections].map(sel => ({
        ...sel,
        [label]: newValue
      }));
      getMultiSelectionStats({
        loader,
        selections: newSelections,
        use3d: false
      }).then(({ domains, sliders }) => {
        setImageSetting({
          onViewportLoad: () => {
            range(newSelections.length).forEach((channel, j) =>
              setPropertiesForChannel(channel, {
                domains: domains[j],
                sliders: sliders[j]
              })
            );
            setImageSetting({ onViewportLoad: () => {} });
            setViewerState({
              isChannelLoading: selections.map(() => false)
            });
          }
        });
        range(newSelections.length).forEach((channel, j) =>
          setPropertiesForChannel(channel, {
            selections: newSelections[j]
          })
        );
      });
    },
    50,
    { trailing: true }
  );
  return (
    <Grid container direction="row" justify="space-between" alignItems="center">
      <Grid item xs={1}>
        {label}:
      </Grid>
      <Grid item xs={11}>
        <Slider
          value={globalSelection[label]}
          onChange={(event, newValue) => {
            setViewerState({
              globalSelection: {
                ...globalSelection,
                [label]: newValue
              }
            });
            if (event.type === 'keydown') {
              changeSelection(event, newValue);
            }
          }}
          onChangeCommitted={changeSelection}
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
