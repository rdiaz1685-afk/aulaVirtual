import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("No se encontró el elemento 'root' en el DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error crítico de renderizado:", error);
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #ef4444;">Error de Carga</h1>
        <p>Hubo un problema al iniciar la aplicación. Por favor, revisa la consola del navegador (F12).</p>
      </div>
    `;
  }
}