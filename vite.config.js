import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  server: { host: '127.0.0.1', port: 5190, strictPort: true, hmr: false },
  preview: { host: '127.0.0.1', port: 5191 },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: 'index.html',
        shop: 'shop.html',
        adminLogin: 'admin/login.html',
        adminDashboard: 'admin/dashboard.html',
      },
    },
  },
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
});
