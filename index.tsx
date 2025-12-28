import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("🚀 ProfesorIA: Iniciando montaje de React...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("❌ Error Fatal: No se encontró el div #root.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ ProfesorIA: Renderizado inicial completado.");
  } catch (error) {
    console.error("❌ Error Crítico en el renderizado:", error);
    rootElement.innerHTML = `
      <div style="color: white; background: #020617; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
        <div>
          <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 10px;">Error de Aplicación</h1>
          <p style="color: #94a3b8; font-size: 14px;">Revisa la consola (F12) para más detalles.</p>
        </div>
      </div>
    `;
  }
}