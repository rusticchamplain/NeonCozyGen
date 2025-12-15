import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  base: '/cozygen/',
  server: {
    proxy: {
      '/cozygen': {
        target: 'http://127.0.0.1:8188',
        changeOrigin: true,
      },
    },
  },
})
