import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA temporarily disabled due to Vite 8 compatibility issues
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg', 'icons.svg'],
    //   manifest: {
    //     name: 'FORGE - Lab Resource Management',
    //     short_name: 'FORGE',
    //     description: 'Facility Operations and Resource Governance Engine',
    //     theme_color: '#001254',
    //     background_color: '#EFEFE9',
    //     display: 'standalone',
    //     orientation: 'portrait-primary',
    //     scope: '/',
    //     start_url: '/',
    //     icons: [
    //       { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/.*\/api\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'forge-api-cache',
    //           expiration: { maxEntries: 50, maxAgeSeconds: 300 },
    //           networkTimeoutSeconds: 10,
    //         },
    //       },
    //     ],
    //   },
    // }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
