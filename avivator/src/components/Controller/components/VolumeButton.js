import React, { useRef, useReducer } from 'react';

import Button from '@material-ui/core/Button';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';

import { makeStyles } from '@material-ui/core/styles';

import {
  useImageSettingsStore,
  useChannelSettings,
  useViewerStore,
  useChannelSetters
} from '../../../state';
import { range, guessRgb, getMultiSelectionStats } from '../../../utils';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // eslint-disable-next-line no-restricted-properties
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const getStatsForResolution = (loader, resolution) => {
  const { shape, labels } = loader[resolution];
  const height = shape[labels.indexOf('y')];
  const width = shape[labels.indexOf('x')];
  const depth = shape[labels.indexOf('z')];
  const depthDownsampled = Math.floor(depth / 2 ** resolution);
  // Check memory allocation limits for Float32Array (used in XR3DLayer for rendering)
  const totalBytes = 4 * height * width * depthDownsampled;
  return { height, width, depthDownsampled, totalBytes };
};

const canLoadResolution = (loader, resolution) => {
  const { totalBytes } = getStatsForResolution(loader, resolution);
  const maxHeapSize =
    window.performance?.memory &&
    window.performance?.memory?.jsHeapSizeLimit / 2;
  const maxSize = maxHeapSize || 2 ** 31 - 1;
  return totalBytes < maxSize;
};

const useStyles = makeStyles(() => ({
  paper: {
    backgroundColor: 'rgba(0, 0, 0, 1)'
  },
  span: {
    width: '70px',
    textAlign: 'center',
    paddingLeft: '2px',
    paddingRight: '2px'
  },
  colors: {
    '&:hover': {
      backgroundColor: 'transparent'
    },
    paddingLeft: '2px',
    paddingRight: '2px'
  }
}));

function VolumeButton() {
  const { setImageSetting } = useImageSettingsStore();
  const { loader, selections } = useChannelSettings();
  const { setPropertiesForChannels } = useChannelSetters();
  const { use3d, toggleUse3d, metadata, setViewerState } = useViewerStore();

  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles();
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        ref={anchorRef}
        onClick={() => {
          toggle();
          // eslint-disable-next-line no-unused-expressions
          if (use3d) {
            toggleUse3d();
            setViewerState({
              isChannelLoading: selections.map(_ => true)
            });
            getMultiSelectionStats({ loader, selections, use3d: !use3d }).then(
              ({ domains, sliders }) => {
                setPropertiesForChannels(range(selections.length), {
                  domains,
                  sliders
                });
                setViewerState({
                  isChannelLoading: selections.map(_ => false)
                });
              }
            );
            const isRgb = metadata && guessRgb(metadata);
            if (!isRgb && metadata) {
              setViewerState({ useLens: true });
            }
          }
        }}
        fullWidth
      >
        {use3d ? 'Hide' : 'Show'} Volumetric Rendering
      </Button>
      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end">
        <Paper className={classes.paper}>
          <ClickAwayListener onClickAway={toggle}>
            <MenuList id="resolution-options">
              {Array.from({ length: loader.length })
                .fill(0)
                // eslint-disable-next-line no-unused-vars
                .map((_, resolution) => {
                  if (loader) {
                    if (canLoadResolution(loader, resolution)) {
                      const {
                        height,
                        width,
                        depthDownsampled,
                        totalBytes
                      } = getStatsForResolution(loader, resolution);
                      return (
                        <MenuItem
                          dense
                          disableGutters
                          onClick={() => {
                            setViewerState({
                              isChannelLoading: selections.map(_ => true)
                            });
                            setImageSetting({ resolution });
                            toggle();
                            getMultiSelectionStats({
                              loader,
                              selections,
                              use3d: true
                            }).then(({ domains, sliders }) => {
                              setImageSetting({
                                onViewportLoad: () => {
                                  setPropertiesForChannels(
                                    range(selections.length),
                                    { domains, sliders }
                                  );
                                  setImageSetting({ onViewportLoad: () => {} });
                                  setViewerState({
                                    isChannelLoading: selections.map(_ => false)
                                  });
                                }
                              });
                              toggleUse3d();
                            });
                            setViewerState({ useLens: false });
                          }}
                          key={`(${height}, ${width}, ${depthDownsampled})`}
                        >
                          {`${resolution}x Downsampled, ~${formatBytes(
                            totalBytes
                          )} per channel, (${height}, ${width}, ${depthDownsampled})`}
                        </MenuItem>
                      );
                    }
                  }
                  return null;
                })}
            </MenuList>
          </ClickAwayListener>
        </Paper>
      </Popper>
    </>
  );
}

export default VolumeButton;
