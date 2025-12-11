import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  build: {
    // Optimize chunk size and split vendor code
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-charts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  assetsInclude: ['**/*.psd'], // Ensure PSD files are treated as assets
  optimizeDeps: {
    exclude: ['@cesdk/cesdk-js', '@imgly/psd-importer']
  }
});
