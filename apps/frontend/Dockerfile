FROM node:22-alpine AS builder
WORKDIR /app

# Copy root configs for workspace context
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/auth/package.json ./apps/auth/package.json
COPY apps/cli/package.json ./apps/cli/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/mcp/package.json ./apps/mcp/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/client/package.json ./packages/client/package.json
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
# Add simple nginx config for SPA routing. index.html must always revalidate —
# it references hashed assets that change every deploy. Hashed /assets files are
# immutable and safe to cache long-term.
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /assets/ { \
        try_files $uri =404; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
