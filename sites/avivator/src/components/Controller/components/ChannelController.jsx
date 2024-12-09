import * as React from 'react';

import { DTYPE_VALUES } from '@hms-dbmi/viv';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import { useShallow } from 'zustand/shallow';

import { FILL_PIXEL_VALUE } from '../../../constants';
import {
  useImageSettingsStore,
  useLoader,
  useViewerStore
} from '../../../state';
import { truncateDecimalNumber } from '../../../utils';
import ChannelOptions from './ChannelOptions';

export const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

const toRgb = (on, arr) => {
  const color = on ? COLORMAP_SLIDER_CHECKBOX_COLOR : arr;
  return `rgb(${color})`;
};

// If the channel is not on, display nothing.
// If the channel has a not-undefined value, show it.
// Otherwise, show a circular progress animation.
const getPixelValueDisplay = (pixelValue, isLoading, shouldShowPixelValue) => {
  if (isLoading) {
    return <CircularProgress size="50%" />;
  }
  if (!shouldShowPixelValue) {
    return FILL_PIXEL_VALUE;
  }
  // Need to check if it's a number becaue 0 is falsy.
  if (pixelValue || typeof pixelValue === 'number') {
    return truncateDecimalNumber(pixelValue, 7);
  }
  return FILL_PIXEL_VALUE;
};

function ChannelController({
  name,
  onSelectionChange,
  channelsVisible,
  pixelValue,
  toggleIsOn,
  handleSliderChange,
  domain,
  slider,
  color,
  handleRemoveChannel,
  handleColorSelect,
  isLoading
}) {
  const loader = useLoader();
  const colormap = useImageSettingsStore(store => store.colormap);
  const [channelOptions, useLinkedView, use3d] = useViewerStore(
    useShallow(store => [
      store.channelOptions,
      store.useLinkedView,
      store.use3d
    ])
  );
  const rgbColor = toRgb(colormap, color);
  const getMinMax = ({ domain: d, mode, loader: l }) => {
    switch (mode) {
      case 'max/min': {
        return d;
      }
      case 'full': {
        const { dtype } = l[0];
        const { max } = DTYPE_VALUES[dtype];
        // Min is 0 for unsigned, or the negative of the max for signed dtypes.
        const min = dtype.startsWith('Int') ? -max : 0;
        return [min, max];
      }
      default: {
        throw new Error();
      }
    }
  };
  const [mode, setMode] = React.useState('max/min');
  const [left, right] = getMinMax({ domain, mode, loader });
  // If the min/right range is and the dtype is float, make the step size smaller so contrastLimits are smoother.
  const { dtype } = loader[0];
  const isFloat = dtype === 'Float32' || dtype === 'Float64';
  const step = right - left < 500 && isFloat ? (right - left) / 500 : 1;
  const shouldShowPixelValue = !useLinkedView && !use3d;
  return (
    <Grid
      container
      direction="column"
      sx={{
        justifyContent: 'center'
      }}
    >
      <Grid
        container
        direction="row"
        sx={{
          justifyContent: 'space-between'
        }}
      >
        <Grid item size={10}>
          <FormControl variant="standard">
            <Select size="small" value={name} onChange={onSelectionChange}>
              {channelOptions.map(opt => (
                <MenuItem disabled={isLoading} key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item size={1}>
          <ChannelOptions
            handleColorSelect={handleColorSelect}
            disabled={isLoading}
            handleModeSelect={setMode}
          />
        </Grid>
        <Grid item size={1}>
          <IconButton
            aria-label="remove-channel"
            component="span"
            size="small"
            onClick={handleRemoveChannel}
          >
            <HighlightOffIcon fontSize="small" />
          </IconButton>
        </Grid>
      </Grid>
      <Grid
        container
        direction="row"
        sx={{
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        <Grid item size={2}>
          {getPixelValueDisplay(pixelValue, isLoading, shouldShowPixelValue)}
        </Grid>
        <Grid item size={2}>
          <Checkbox
            onChange={toggleIsOn}
            disabled={isLoading}
            checked={channelsVisible}
            style={{
              color: rgbColor,
              '&$checked': {
                color: rgbColor
              }
            }}
          />
        </Grid>
        <Grid item size={7}>
          <Slider
            size="small"
            disabled={isLoading}
            value={slider}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            getAriaLabel={() => `${name}-${color}-${slider}`}
            valueLabelFormat={v => truncateDecimalNumber(v, 5)}
            min={left}
            max={right}
            step={step}
            orientation="horizontal"
            style={{
              color: rgbColor,
              marginTop: '7px'
            }}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default ChannelController;
