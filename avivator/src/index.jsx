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
import Avivator from './Avivator';
import { getNameFromUrl } from './utils';

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

function getRandomSource() {
  return sources[Math.floor(Math.random() * sources.length)];
}

// https://reactrouter.com/web/example/query-parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function RoutedAvivator(props) {
  const query = useQuery();
  const url = query.get('image_url');
  const {
    routeProps: { history }
  } = props;
  if (url) {
    const urlSrouce = {
      urlOrFile: url,
      description: getNameFromUrl(url)
    };
    return (
      <ThemeProvider theme={darkTheme}>
        <Avivator source={urlSrouce} history={history} />
      </ThemeProvider>
    );
  }
  const source = getRandomSource();
  return (
    <ThemeProvider theme={darkTheme}>
      <Avivator source={source} history={history} isDemoImage />
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
