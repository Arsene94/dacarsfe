import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'esnext', // sau 'es2017', 'es2018' etc, evită transpiling inutil
  },
  test: {
    environment: 'jsdom',
  },
});
