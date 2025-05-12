import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    headers: {
      // Allow popups for Firebase Google Sign-In
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // You might also need to experiment with Cross-Origin-Embedder-Policy if issues persist
      // 'Cross-Origin-Embedder-Policy': 'require-corp', // or 'unsafe-none'
    }
  }
}) 