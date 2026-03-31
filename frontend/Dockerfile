FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG VITE_API_URL=http://backend:3000
ARG VITE_FEATURE_FLAGS=admin-analytics,notifications,saved-views,advanced-exports,dark-mode,i18n
ARG VITE_DEFAULT_LOCALE=es
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_FEATURE_FLAGS=${VITE_FEATURE_FLAGS}
ENV VITE_DEFAULT_LOCALE=${VITE_DEFAULT_LOCALE}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
