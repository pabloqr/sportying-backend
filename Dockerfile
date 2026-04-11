# ---- deps ----
FROM node:24.13-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- deps-prod ----
FROM node:24.13-alpine AS deps-prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- build ----
FROM node:24.13-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:24.13-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copiar las dependencias
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/prisma/ ./prisma/
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main"]
