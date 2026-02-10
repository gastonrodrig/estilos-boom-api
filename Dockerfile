# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096

COPY package*.json ./
RUN npm ci

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist/src/main.js"]

