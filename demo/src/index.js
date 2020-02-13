import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import './index.css';
import App from './App';

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark'
  }
});

ReactDOM.render(
  <ThemeProvider theme={darkTheme}>
    <App />
  </ThemeProvider>,
  document.getElementById('root')
);
