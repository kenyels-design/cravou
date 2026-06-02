import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'flag-icons/css/flag-icons.min.css';
import App from './App';
import { initializeTheme } from './context/ThemeContext';
import './index.css';

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
