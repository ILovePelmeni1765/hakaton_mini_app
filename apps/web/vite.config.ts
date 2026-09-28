import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  resolve: { alias: {
    '@pulse/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    '@pulse/platform': fileURLToPath(new URL('../../packages/platform/src/index.ts', import.meta.url)),
    '@pulse/ui': fileURLToPath(new URL('../../packages/ui/src/index.tsx', import.meta.url)),
  } },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3000', changeOrigin: true, ws: true },
    },
  },
  preview: { port: 4173 },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', 'socket.io-client'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          icons: ['lucide-react'],
          dates: ['date-fns'],
        },
      },
    },
  },
});
