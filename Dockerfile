# ---- deps ----
FROM node:24.13-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

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
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/prisma/generated ./prisma/generated
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# Eliminar las dependencias del entorno de desarrollo
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["node", "dist/main"]
