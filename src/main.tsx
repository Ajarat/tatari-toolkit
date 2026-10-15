import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import { initSync } from './sync';
import './index.css';

initSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Hash routing so the static build works from any host or sub-path without rewrites. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
