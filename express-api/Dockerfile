# Dockerfile Express — Biblioteca IUB (proveedores/compras/detalles)
# Imagen ligera de Node 20; ejecuta npm ci para reproducibilidad.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY package.json ./

ENV NODE_ENV=production
ENV EXPRESS_PORT=4000

EXPOSE 4000

CMD ["npm", "start"]
