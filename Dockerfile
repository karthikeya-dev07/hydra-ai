# ════════════════════════════════════════════════
# HYDRA AI — Frontend (Next.js)
# ════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS frontend
WORKDIR /app
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
