import React, { PureComponent } from 'react';
import VivViewer from './VivViewer';
import { DetailView, OverviewView } from '../views';

export default class OverviewDetailViewer extends PureComponent {
  render() {
    const {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      initialViewState,
      colormap,
      overview,
      overviewOn
    } = this.props;
    const detailViewState = { ...initialViewState, id: 'detail' };
    const detailView = new DetailView({ initialViewState: detailViewState });
    const props = {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      colormap
    };
    const views = [detailView];
    const layerProps = [props];
    if (overviewOn && loader) {
      const overviewViewState = { ...initialViewState, id: 'overview' };
      const overviewView = new OverviewView({
        initialViewState: overviewViewState,
        loader,
        detailHeight: initialViewState.height,
        detailWidth: initialViewState.width,
        ...overview
      });
      views.push(overviewView);
      layerProps.push(props);
    }
    return loader ? <VivViewer layerProps={layerProps} views={views} /> : null;
  }
}
