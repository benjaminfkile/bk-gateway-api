# ---- Build stage ----
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy ALL source (root index.ts + src/)
COPY . .

# Compile TS → dist/
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime

WORKDIR /app

# Install only prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
