import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'path'

// Load .env file variables into process.env
// Vite by default loads .env files, but this makes it more explicit
// and allows us to use process.env for the define block.
// It will load .env from the project root.
dotenv.config()

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
    },
    // Removing proxy as localhost will now directly hit live Firebase Storage
    // and CORS for localhost is configured on the bucket itself.
    /*
    proxy: {
      '/firebase-storage-proxy': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firebase-storage-proxy/, '')
      }
    }
    */
  },
  define: {
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.VITE_FIREBASE_MEASUREMENT_ID),
    // Add any other VITE_ variables you use here, for example:
    // 'import.meta.env.VITE_SOME_OTHER_VAR': JSON.stringify(process.env.VITE_SOME_OTHER_VAR),
  }
}) 