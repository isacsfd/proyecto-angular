// Debe importarse ANTES que config.js/app.js para que la API use la BD de pruebas.
process.env.DB_DATABASE = process.env.DB_DATABASE || 'biblioteca_iub_compras_test';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:4200';