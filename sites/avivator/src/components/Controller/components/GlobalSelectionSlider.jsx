import Grid from '@mui/material/Grid2';
import Slider from '@mui/material/Slider';
import debounce from 'lodash/debounce';
import React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useShallow } from 'zustand/shallow';

import {
  useChannelsStore,
  useImageSettingsStore,
  useLoader,
  useViewerStore
} from '../../../state';
import { getMultiSelectionStats, range } from '../../../utils';

export default function GlobalSelectionSlider(props) {
  const { size, label } = props;
  const [selections, setPropertiesForChannel] = useChannelsStore(
    useShallow(store => [store.selections, store.setPropertiesForChannel])
  );
  const loader = useLoader();
  const globalSelection = useViewerStore(store => store.globalSelection);
  const changeSelection = debounce(
    (_event, newValue) => {
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
    { leading: true }
  );

  return (
    <Grid
      container
      direction="row"
      sx={{
        justifyContent: 'space-between',
        alignItems: 'stretch'
      }}
    >
      <Grid item size={1}>
        {label}:
      </Grid>
      <Grid item size={11}>
        <Slider
          size="small"
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
          marks={true}
          min={0}
          max={size - 1}
          orientation="horizontal"
          style={{ marginTop: '7px' }}
          step={1}
        />
      </Grid>
    </Grid>
  );
}
