import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Django auth (port 8000)
      '/django': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/django/, ''),
      },
      // FastAPI (port 8001) — chỉ cần nếu cũng bị CORS
      '/api/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
