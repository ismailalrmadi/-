import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error("Global Error:", msg, "at", url, lineNo, columnNo);
  if (error && error.stack) {
    console.error(error.stack);
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.background = 'red';
    div.style.color = 'white';
    div.style.zIndex = '9999';
    div.style.padding = '20px';
    div.innerText = error.stack;
    document.body.appendChild(div);
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
