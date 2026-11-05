import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // Read .env too (not only the shell), so KOLOFI_API_PROXY in .env takes effect.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const apiProxy = env.KOLOFI_API_PROXY || 'http://kolofi-backend.test'

  return {
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kólófi',
        short_name: 'Kólófi',
        description: 'Save in dollars and run ajo circles where nobody can run with the pot.',
        theme_color: '#06070A',
        background_color: '#06070A',
        id: '/',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['finance'],
        // Shown in the richer install dialog on Android and desktop Chrome/Edge.
        screenshots: [
          { src: 'screenshots/desktop-home.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Your balance, savings and circles at a glance' },
          { src: 'screenshots/desktop-circle.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide', label: 'Every seat, cycle and payout in your circle' },
          { src: 'screenshots/phone-home.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Your balance and next contribution' },
          { src: 'screenshots/phone-save.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Goals and locked savings that earn daily' },
          { src: 'screenshots/phone-circle.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Ajo where nobody can run with the pot' },
        ],
        // Long-press (Android) or right-click (desktop) the app icon.
        shortcuts: [
          { name: 'Add money', url: '/wallet/add', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Save', url: '/save', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Circles', url: '/circles', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], globIgnores: ['screenshots/**'] },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Keep big, rarely-changing vendors in their own long-cacheable chunks.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
            { name: 'router', test: /node_modules[\/]react-router[\/]/ },
            { name: 'motion', test: /node_modules[\/](framer-motion|motion-dom|motion-utils)[\/]/ },
            { name: 'query', test: /node_modules[\/]@tanstack[\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    // In http mode the app calls `/api/v1`; in development that is proxied to the Laravel API.
    proxy: { '/api': { target: apiProxy, changeOrigin: true } },
  },
  }
})
