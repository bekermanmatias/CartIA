FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_ROOT_DOMAIN=cartia.ar
ARG VITE_PLATFORM_ORIGIN=https://app.cartia.ar
ARG VITE_SALES_WHATSAPP_URL=
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
ENV VITE_PLATFORM_ORIGIN=$VITE_PLATFORM_ORIGIN
ENV VITE_SALES_WHATSAPP_URL=$VITE_SALES_WHATSAPP_URL
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/conf.d/production.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist/client /usr/share/nginx/html
EXPOSE 80
