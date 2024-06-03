import { grey } from '@material-ui/core/colors';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';

import Avivator from './Avivator';
import sources from './source-info';
import { getNameFromUrl } from './utils';

const theme = createTheme({
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

/** @param {string | null} url */
function resolveSource(url) {
  if (url) {
    return {
      urlOrFile: url,
      description: getNameFromUrl(url),
      isDemoImage: false
    };
  }
  // Pick a random source if none is specified.
  return {
    ...sources[Math.floor(Math.random() * sources.length)],
    isDemoImage: true
  };
}

function App() {
  const query = new URLSearchParams(window.location.search);
  const source = resolveSource(query.get('image_url'));
  return (
    <ThemeProvider theme={theme}>
      <Avivator source={source} isDemoImage={source.isDemoImage} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
