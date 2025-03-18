import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Preload PDF.js library
const preloadPdfJs = () => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.crossOrigin = 'anonymous';
  script.referrerPolicy = 'no-referrer';
  script.onload = () => {
    // Set the worker source after the library is loaded
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  };
  document.head.appendChild(script);
};

// Call preload function after a short delay to not block initial rendering
setTimeout(preloadPdfJs, 1000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 