import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev API (backend-folder) listens on 3000 by default. Override both with
// API_PROXY_TARGET / PORT when something else already owns that port.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        rollupOptions: {
            output: {
                // Split the big, rarely changing libraries out of the app
                // bundle so a code change does not invalidate all of them.
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    motion: ['motion', 'gsap'],
                },
            },
        },
    },
    server: {
        proxy: {
            '/api': { target: apiTarget, changeOrigin: true },
        },
    },
});
