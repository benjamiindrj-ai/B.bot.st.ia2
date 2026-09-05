import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

// Intercept unhandled promise rejections and script errors gracefully
window.addEventListener('error', (event) => {
  console.warn('[Global Error Intercepted]:', event.message, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Global Promise Rejection Intercepted]:', event.reason);
});

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

