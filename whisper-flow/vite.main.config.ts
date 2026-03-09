import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@whisper-poc': path.resolve(__dirname, '../whisper-poc/src'),
    },
  },
});
