FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
