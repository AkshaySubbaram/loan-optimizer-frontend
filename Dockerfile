# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Stage 2: serve with nginx
FROM nginx:alpine
LABEL org.opencontainers.image.source="https://github.com/AkshaySubbaram/loan-optimizer-frontend"

RUN apk add --no-cache tini

# remove default nginx files
RUN rm -rf /usr/share/nginx/html/*

# ✅ VERY IMPORTANT FIX
COPY --from=builder /app/dist/loan-frontend/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
STOPSIGNAL SIGTERM
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["nginx", "-g", "daemon off;"]