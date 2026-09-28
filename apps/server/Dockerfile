FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @pulse/server... --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @pulse/shared build && pnpm --filter @pulse/server prisma:generate && pnpm --filter @pulse/server build

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
