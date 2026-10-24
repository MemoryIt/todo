import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so container port forwarding (and access from the
    // host) can reach the dev server. Without this Vite binds IPv6 localhost
    // only, while VS Code forwards to 127.0.0.1.
    host: true,
    proxy: {
      // In development the Hono API runs on port 3000.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
