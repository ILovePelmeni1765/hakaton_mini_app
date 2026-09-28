# Пульс города: памятка агентам

## Структура

- `apps/web` — React/Vite-клиент, обычный браузер и Mini App.
- `apps/server` — NestJS API, Socket.IO, Prisma и локальные uploads.
- `packages/shared` — общие статусы, типы и Zod-схемы.
- `packages/platform` — Browser, Telegram и каркас MAX адаптеров.
- `packages/ui` — небольшая доступная UI-система.

## Команды

- `pnpm install` — установка workspace-зависимостей.
- `pnpm dev` — клиент и API в watch-режиме.
- `pnpm db:generate` — Prisma Client.
- `pnpm db:migrate` — локальная миграция БД.
- `pnpm db:seed` — демонстрационные данные.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — обязательные проверки.
- `pnpm test:e2e` — Playwright smoke-тест.

## Правила

- TypeScript strict; не использовать `any` в новых доменных API без объяснимой границы интеграции.
- DTO валидируются на сервере, общие входные схемы — в `packages/shared`.
- Автор, роль и организация берутся только из проверенного JWT/Telegram initData, не из тела запроса.
- Любой статус меняется только через `ProblemStateMachineService` с записью `StatusHistory`.
- Исполнитель никогда не устанавливает `RESOLVED`.
- Платформенные особенности доступны только через `MiniAppPlatform`.
- Файлы проходят MIME/size-проверку и пересборку через Sharp; секреты не коммитятся.
- Zustand хранит только глобальное клиентское состояние; серверные данные — TanStack Query.

## Готовность изменения

Изменение готово, если сценарий работает через UI, роли проверяются сервером, история и realtime обновляются, нет горизонтального скролла от 360 px, а lint, typecheck, tests и production build проходят.
