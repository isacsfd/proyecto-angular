// Configuración de PRODUCCIÓN (se aplica con `ng build --configuration production`,
// que es la configuración por defecto del proyecto). Reemplaza a `environment.ts`
// mediante `fileReplacements` en angular.json.
//
// - Sin barra final.
// - No incluir secretos (este archivo se empaqueta en el bundle público).
// - apiUrl: FastAPI desplegada (Render). expressApiUrl: API Express desplegada
//   (Render + TiDB) para el módulo Compras/Proveedores, activada tras validar
//   /health, /health/db, JWT, introspección y CRUD remoto en producción.
export const environment = {
  production: true,
  // API principal (FastAPI desplegada). Ej: 'https://api-biblioteca-iub.onrender.com'
  apiUrl: 'https://biblioteca-iub-api.onrender.com',
  // API Express desplegada (módulo Compras/Proveedores). Sin barra final.
  // Se activa solo tras validar /health, /health/db, JWT, introspección y CRUD en producción.
  expressApiUrl: 'https://biblioteca-iub-express.onrender.com',
};
