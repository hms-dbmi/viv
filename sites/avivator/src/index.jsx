import { grey } from '@mui/material/colors';
import { ThemeProvider, StyledEngineProvider, createTheme, adaptV4Theme } from '@mui/material/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';

import Avivator from './Avivator';
import sources from './source-info';
import { getNameFromUrl } from './utils';

const theme = createTheme(adaptV4Theme({
  palette: {
    mode: 'dark',
    primary: grey,
    secondary: grey
  },
  props: {
    MuiButtonBase: {
      disableRipple: true
    }
  }
}));

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
    <StyledEngineProvider injectFirst>
      (<ThemeProvider theme={theme}>
        <Avivator source={source} isDemoImage={source.isDemoImage} />
      </ThemeProvider>)
    </StyledEngineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
