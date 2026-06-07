import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/morpholody/',
  build: {
    outDir: 'docs',
  },
});
