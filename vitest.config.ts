import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    target: 'esnext', // sau 'es2017', 'es2018' etc, evită transpiling inutil
  },
  test: {
    environment: 'jsdom',
  },
});
