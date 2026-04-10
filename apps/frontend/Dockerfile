FROM node:22-alpine AS builder
WORKDIR /app

# Copy root configs for workspace context
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/auth/package.json ./apps/auth/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN npm ci

# Copy full source
COPY . .

# Generate client
RUN npm run generate:client

# Build frontend
WORKDIR /app/apps/frontend
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
# Add simple nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
