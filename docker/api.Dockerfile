FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/sandbox/fixtures ./fixtures
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
