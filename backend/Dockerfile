FROM node:20-bookworm AS deps
WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci

FROM node:20-bookworm AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY .npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
