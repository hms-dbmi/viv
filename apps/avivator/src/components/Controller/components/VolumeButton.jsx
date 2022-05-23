import React, { useRef, useReducer } from 'react';

import Button from '@material-ui/core/Button';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';

import { makeStyles } from '@material-ui/core/styles';

import shallow from 'zustand/shallow';

import {
  useImageSettingsStore,
  useViewerStore,
  useChannelsStore,
  useLoader
} from '../../../state';
import { range, getMultiSelectionStats, getBoundingCube } from '../../../utils';

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
  // eslint-disable-next-line no-bitwise
  const depthDownsampled = Math.max(1, depth >> resolution);
  // Check memory allocation limits for Float32Array (used in XR3DLayer for rendering)
  const totalBytes = 4 * height * width * depthDownsampled;
  return { height, width, depthDownsampled, totalBytes };
};

const canLoadResolution = (loader, resolution) => {
  const { totalBytes, height, width, depthDownsampled } = getStatsForResolution(
    loader,
    resolution
  );
  const maxHeapSize =
    window.performance?.memory &&
    window.performance?.memory?.jsHeapSizeLimit / 2;
  const maxSize = maxHeapSize || 2 ** 31 - 1;
  // 2048 is a normal texture size limit although some browsers go larger.
  return (
    totalBytes < maxSize &&
    height < 2048 &&
    depthDownsampled < 2048 &&
    width < 2048 &&
    depthDownsampled > 1
  );
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
  const [selections, setPropertiesForChannel] = useChannelsStore(
    store => [store.selections, store.setPropertiesForChannel],
    shallow
  );
  const loader = useLoader();
  const [
    use3d,
    toggleUse3d,
    toggleIsVolumeRenderingWarningOn,
    isViewerLoading
  ] = useViewerStore(
    store => [
      store.use3d,
      store.toggleUse3d,
      store.toggleIsVolumeRenderingWarningOn,
      store.isViewerLoading
    ],
    shallow
  );

  const [open, toggle] = useReducer(v => !v, false);
  const anchorRef = useRef(null);
  const classes = useStyles();
  const { shape, labels } = Array.isArray(loader) ? loader[0] : loader;
  // Only show volume button if we can actually view resolutions.
  const hasViewableResolutions = Array.from({
    length: loader.length
  }).filter((_, resolution) => canLoadResolution(loader, resolution)).length;
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        ref={anchorRef}
        disabled={
          !(shape[labels.indexOf('z')] > 1) ||
          isViewerLoading ||
          !hasViewableResolutions
        }
        onClick={() => {
          toggle();
          // eslint-disable-next-line no-unused-expressions
          if (use3d) {
            toggleUse3d();
            useViewerStore.setState({
              isChannelLoading: Array(selections.length).fill(true)
            });
            getMultiSelectionStats({ loader, selections, use3d: !use3d }).then(
              ({ domains, contrastLimits }) => {
                range(selections.length).forEach((channel, j) =>
                  setPropertiesForChannel(channel, {
                    domains: domains[j],
                    contrastLimits: contrastLimits[j]
                  })
                );
                useViewerStore.setState({
                  isChannelLoading: Array(selections.length).fill(false)
                });
              }
            );
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
                            useViewerStore.setState({
                              isChannelLoading: Array(selections.length).fill(
                                true
                              )
                            });
                            const [xSlice, ySlice, zSlice] = getBoundingCube(
                              loader
                            );
                            useImageSettingsStore.setState({
                              resolution,
                              xSlice,
                              ySlice,
                              zSlice
                            });
                            toggle();
                            getMultiSelectionStats({
                              loader,
                              selections,
                              use3d: true
                            }).then(({ domains, contrastLimits }) => {
                              range(selections.length).forEach((channel, j) =>
                                setPropertiesForChannel(channel, {
                                  domains: domains[j],
                                  contrastLimits: contrastLimits[j]
                                })
                              );
                              useImageSettingsStore.setState({
                                onViewportLoad: () => {
                                  useImageSettingsStore.setState({
                                    onViewportLoad: () => {}
                                  });
                                  useViewerStore.setState({
                                    isChannelLoading: Array(
                                      selections.length
                                    ).fill(false)
                                  });
                                }
                              });
                              toggleUse3d();
                              const isWebGL2Supported = !!document
                                .createElement('canvas')
                                .getContext('webgl2');
                              if (!isWebGL2Supported) {
                                toggleIsVolumeRenderingWarningOn();
                              }
                            });
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
