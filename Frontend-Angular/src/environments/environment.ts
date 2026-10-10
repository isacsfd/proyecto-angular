// Configuración de DESARROLLO (valor por defecto; se usa con `ng serve`).
export const environment = {
  production: false,
  // API principal (FastAPI). Sin barra final.
  apiUrl: 'http://127.0.0.1:8000',
  // API Express + MySQL (proveedores/compras). Sin barra final.
  expressUrl: 'http://127.0.0.1:3001',
};