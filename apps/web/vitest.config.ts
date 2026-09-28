import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    '@pulse/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    '@pulse/platform': fileURLToPath(new URL('../../packages/platform/src/index.ts', import.meta.url)),
    '@pulse/ui': fileURLToPath(new URL('../../packages/ui/src/index.tsx', import.meta.url)),
  } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', include: ['src/**/*.spec.{ts,tsx}'] },
});
