FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa poppler-utils \
  && rm -rf /var/lib/apt/lists/* \
  && npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/migrations ./src/migrations
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
