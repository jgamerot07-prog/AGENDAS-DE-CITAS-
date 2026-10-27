import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las peticiones a /api se envían al backend
    proxy: { '/api': 'http://localhost:4000' },
  },
});
