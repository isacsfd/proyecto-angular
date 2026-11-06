// Configuración de DESARROLLO (valor por defecto; se usa con `ng serve`).
export const environment = {
  production: false,
  // API principal (FastAPI). Sin barra final.
  apiUrl: 'http://127.0.0.1:8000',
  // API Express local para Proveedores/Compras/Detalles. Sin barra final.
  expressApiUrl: 'http://127.0.0.1:4000',
};
