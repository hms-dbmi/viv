import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import sources from './sources';

const urlParams = new URLSearchParams(window.location.search);
const demo = urlParams.get('demo');

if (demo in sources) {
  const source = sources[demo];
  ReactDOM.render(<App source={source} />, document.getElementById('root'));
} else {
  const defaultDemo = Object.keys(sources)[0];
  window.location.search = `?demo=${defaultDemo}`;
}
