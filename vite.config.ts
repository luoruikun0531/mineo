import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { skinExportPlugin } from './vite-plugin-skin-export';
import { quotesMockPlugin } from './vite-plugin-quotes-mock';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), skinExportPlugin(), quotesMockPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
