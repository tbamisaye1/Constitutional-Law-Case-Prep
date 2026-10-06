import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: browser talks to same origin, Vite forwards /api to FastAPI.
// That avoids CORS headaches while we learn the stack.
export default defineConfig({
  plugins: [react()],
  // Lets the app tell a Vercel preview build from production (sandbox
  // workspace override is preview-only; see src/lib/workspace.js).
  define: {
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || ''),
  },
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
