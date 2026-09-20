import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import './index.css';

// Safeguard against unhandled promise rejections in sandboxed iframes (e.g. popup cancellations, clipboard denials)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Avoid logging or crashing on benign iframe/popup cancellations
    const reason = event?.reason;
    if (
      reason?.code === 'auth/popup-closed-by-user' ||
      reason?.code === 'auth/cancelled-popup-request' ||
      reason?.name === 'NotAllowedError'
    ) {
      event.preventDefault();
      return;
    }
    console.warn('Caught unhandled promise rejection:', reason);
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
