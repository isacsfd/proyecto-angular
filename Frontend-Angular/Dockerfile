# ── Etapa 1: compilar Angular (producción) ───────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# La URL de la API se configura en tiempo de build (sin tocar el repositorio).
ARG API_URL=http://localhost:8000
RUN sed -i "s|apiUrl: '.*'|apiUrl: '${API_URL}'|" src/environments/environment.production.ts \
    && npm run build -- --configuration production

# ── Etapa 2: servir con nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/Frontend-Angular/browser /usr/share/nginx/html

EXPOSE 80