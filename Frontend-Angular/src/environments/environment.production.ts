// Configuración de PRODUCCIÓN (se aplica con `ng build --configuration production`,
// que es la configuración por defecto del proyecto). Reemplaza a `environment.ts`
// mediante `fileReplacements` en angular.json.
//
// ⚠️ PENDIENTE: sustituir por las URLs reales de las APIs desplegadas.
//    - Sin barra final.
//    - No incluir secretos (este archivo se empaqueta en el bundle público).
//    - El dominio `.invalid` es un TLD reservado (RFC 2606): nunca resuelve y
//      evidencia que el valor aún NO ha sido reemplazado.
export const environment = {
  production: true,
  // API principal (FastAPI desplegada). Ej: 'https://api-biblioteca-iub.onrender.com'
  apiUrl: 'https://api-fastapi-PENDIENTE.invalid',
  // API Express + MySQL desplegada (opcional, si el frontend la consume).
  expressUrl: 'https://api-express-PENDIENTE.invalid',
};