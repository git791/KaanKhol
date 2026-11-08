import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'gsap-vendor': ['gsap', 'lenis'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@kaankhol/core'],
  },
})
