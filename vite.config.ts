import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Travel Marks',
      short_name: 'TravelMarks',
      start_url: '.',
      display: 'standalone',
      background_color: '#F4F6FF',
      theme_color: '#10375C',
      description: 'A minimal, modern PWA for animating travel routes on a map.',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  })],
})
