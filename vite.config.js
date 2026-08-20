import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: browser talks to same origin, Vite forwards /api to FastAPI.
// That avoids CORS headaches while we learn the stack.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
