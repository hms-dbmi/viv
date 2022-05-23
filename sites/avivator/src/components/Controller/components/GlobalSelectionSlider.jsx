import React, { useCallback } from 'react';
// eslint-disable-next-line camelcase
import { unstable_batchedUpdates } from 'react-dom';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import debounce from 'lodash/debounce';
import shallow from 'zustand/shallow';

import { range, getMultiSelectionStats } from '../../../utils';
import {
  useChannelsStore,
  useViewerStore,
  useImageSettingsStore,
  useLoader
} from '../../../state';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const [selections, setPropertiesForChannel] = useChannelsStore(
    store => [store.selections, store.setPropertiesForChannel],
    shallow
  );
  const loader = useLoader();
  const globalSelection = useViewerStore(store => store.globalSelection);
  const changeSelection = useCallback(
    debounce(
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
          unstable_batchedUpdates(() => {
            range(newSelections.length).forEach((channel, j) =>
              setPropertiesForChannel(channel, {
                domains: domains[j],
                contrastLimits: contrastLimits[j]
              })
            );
          });
          unstable_batchedUpdates(() => {
            useImageSettingsStore.setState({
              onViewportLoad: () => {
                useImageSettingsStore.setState({
                  onViewportLoad: () => {}
                });
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
        });
      },
      50,
      { trailing: true }
    ),
    [loader, selections]
  );
  return (
    <Grid container direction="row" justifyContent="space-between" alignItems="center">
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
