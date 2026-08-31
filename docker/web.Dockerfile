FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist/client /usr/share/nginx/html
EXPOSE 80
