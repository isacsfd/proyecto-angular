import { crearApp } from './app.js';
import { config } from './config.js';

const app = crearApp();

app.listen(config.port, () => {
  console.log(`API Express (Biblioteca IUB) escuchando en http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/health`);
});