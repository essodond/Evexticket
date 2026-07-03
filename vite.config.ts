import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false, // Allow alternative port if 5173 in use
    open: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'admin.evex-tg.local',
      'compagnie.evex-tg.local',
      'company.evex-tg.local',
      'admin.evex-tg.com',
      'compagnie.evex-tg.com',
      'company.evex-tg.com',
    ],
  },
  optimizeDeps: {
    include: ['lucide-react']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide-react': ['lucide-react']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
