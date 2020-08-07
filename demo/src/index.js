import React from 'react';
import ReactDOM from 'react-dom';
import {
  useLocation,
  BrowserRouter as Router,
  Switch,
  Route
} from 'react-router-dom';
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';

import sources from './source-info';
import { Avivator } from '../../src';

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: grey,
    secondary: grey
  },
  props: {
    MuiButtonBase: {
      disableRipple: true
    }
  }
});

// https://reactrouter.com/web/example/query-parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function RoutedAvivator(props) {
  const query = useQuery();
  const url = query.get('image_url');
  if (url && sources.filter(source => source.url == url).length === 0) {
    const sourcesWithUrl = [
      {
        url,
        description: url
          .split('?')[0]
          .split('/')
          .slice(-1)[0]
      }
    ].concat(sources);
    console.log(props.routeProps.history);
    return (
      <ThemeProvider theme={darkTheme}>
        <Avivator sources={sourcesWithUrl} history={props.routeProps.history} />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider theme={darkTheme}>
      <Avivator sources={sources} history={props.routeProps.history} />
    </ThemeProvider>
  );
}
ReactDOM.render(
  <Router>
    <Switch>
      <Route
        path="/"
        render={routeProps => <RoutedAvivator routeProps={routeProps} />}
      />
    </Switch>
  </Router>,
  document.getElementById('root')
);
