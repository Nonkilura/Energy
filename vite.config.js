import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/tmd': {
        target: 'https://data.tmd.go.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmd/, '')
      }
    }
  }
})