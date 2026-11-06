const { config, validateConfig } = require('./config');
const { createApp } = require('./app');

validateConfig();
const app = createApp({ validate: false });
// Host: 0.0.0.0 por defecto para plataformas de despliegue (Render).
// Localmente se puede fijar EXPRESS_HOST=127.0.0.1 en .env para privacidad.
const HOST = process.env.EXPRESS_HOST || '0.0.0.0';
const server = app.listen(config.port, HOST, () => {
  console.log(`Biblioteca IUB Express escuchando en ${HOST}:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal}: cerrando API Express`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
