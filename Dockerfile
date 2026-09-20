# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
ARG API_URL=https://api.dev.iconic.neurocodejo.com
ENV API_URL=${API_URL}

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/env.js.template /etc/nginx/templates/env.js.template
COPY docker/40-generate-env.sh /docker-entrypoint.d/40-generate-env.sh
RUN chmod +x /docker-entrypoint.d/40-generate-env.sh

# Angular's application builder emits browser assets under dist/construction/browser.
COPY --from=build /app/dist/construction/browser /usr/share/nginx/html

EXPOSE 8080
