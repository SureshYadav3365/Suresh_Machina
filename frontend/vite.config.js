import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://suresh-machina.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
