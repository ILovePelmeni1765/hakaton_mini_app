FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/platform/package.json packages/platform/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @pulse/web... --frozen-lockfile=false
COPY packages packages
COPY apps/web apps/web
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_SOCKET_URL=http://localhost:3000
ARG VITE_DGIS_MAPS_API_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_DGIS_MAPS_API_KEY=$VITE_DGIS_MAPS_API_KEY
RUN pnpm build:packages && pnpm --filter @pulse/web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
