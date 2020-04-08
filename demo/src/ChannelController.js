import React from 'react';
import { Slider, Checkbox } from '@material-ui/core';

const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

function ChannelController({
  channel,
  channelOn,
  sliderValue,
  channelOptions,
  colorValue,
  handleChannelChange,
  colormapOn = false
}) {
  return (
    <>
      <select
        value={channel}
        key={channel}
        onChange={e => handleChannelChange('CHANGE_CHANNEL', e.target.value)}
      >
        {channelOptions.map((name, j) => (
          <option key={name} value={j}>
            {name}
          </option>
        ))}
      </select>
      <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
        <Checkbox
          onChange={() => handleChannelChange('TOGGLE_ON')}
          checked={channelOn}
          style={{
            color: `rgb(${
              colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValue
            })`,
            '&$checked': {
              color: `rgb(${
                colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValue
              })`
            }
          }}
        />
        <Slider
          value={sliderValue}
          onChange={(event, value) =>
            handleChannelChange('CHANGE_SLIDER', value)
          }
          valueLabelDisplay="auto"
          getAriaLabel={() => channel}
          min={MIN_SLIDER_VALUE}
          max={MAX_SLIDER_VALUE}
          style={{
            color: `rgb(${
              colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValue
            })`,
            top: '7px'
          }}
          orientation="horizontal"
        />
      </div>
    </>
  );
}

export default ChannelController;
