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
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:24.13-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copiar las dependencias
COPY prisma.config.ts ./
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/prisma/generated ./prisma/generated
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
