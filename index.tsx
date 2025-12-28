import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Buscamos el div "root" que definimos en el HTML
const container = document.getElementById('root');

if (!container) {
  // Si no existe, algo salió muy mal en el HTML
  console.error("No se encontró el elemento #root");
} else {
  // Creamos la aplicación de React dentro de ese div
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
