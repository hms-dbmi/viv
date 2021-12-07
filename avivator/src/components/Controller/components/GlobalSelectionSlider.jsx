import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import debounce from 'lodash/debounce';
import shallow from 'zustand/shallow';

import { range, getMultiSelectionStats } from '../../../utils';
import {
  useChannelsStore,
  useViewerStore,
  useImageSettingsStore
} from '../../../state';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const [selections, loader, setPropertiesForChannel] = useChannelsStore(
    store => [store.selections, store.loader, store.setPropertiesForChannel],
    shallow
  );
  const globalSelection = useViewerStore(store => store.globalSelection);
  const changeSelection = debounce(
    (event, newValue) => {
      useViewerStore.setState({
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
      }).then(({ domains, contrastLimits }) => {
        useImageSettingsStore.setState({
          onViewportLoad: () => {
            range(newSelections.length).forEach((channel, j) =>
              setPropertiesForChannel(channel, {
                domains: domains[j],
                contrastLimits: contrastLimits[j]
              })
            );
            useImageSettingsStore.setState({ onViewportLoad: () => {} });
            useViewerStore.setState({
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
            useViewerStore.setState({
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
