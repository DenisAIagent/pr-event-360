import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Le back-end Express tourne sur PORT=4000 ; les appels /api sont proxifiés en dev.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
