import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import theme from './theme';
import App from './App.tsx';
import './index.css';

// ─── Entry Point ──────────────────────────────────────────────────────────────
//
// ThemeProvider  — injects our custom MUI theme into all components
// CssBaseline    — MUI's CSS reset (removes browser default margins/padding)
// StrictMode     — React dev tool: highlights potential problems
//
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
