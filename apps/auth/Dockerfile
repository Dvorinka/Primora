FROM node:20-alpine
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/auth/package.json ./apps/auth/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @primora/auth

EXPOSE 3001

CMD ["node", "apps/auth/dist/index.js"]

