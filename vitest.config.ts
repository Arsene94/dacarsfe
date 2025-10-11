import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'react-facebook-pixel': path.resolve(__dirname, './vitest.react-facebook-pixel.stub.ts'),
    },
  },
  build: {
    target: 'esnext', // sau 'es2017', 'es2018' etc, evită transpiling inutil
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
