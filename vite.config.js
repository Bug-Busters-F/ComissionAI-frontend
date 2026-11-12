import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }

  return {
    plugins: [vue()],
    server: {
      // 0.0.0.0 permite acessar o servidor de fora do container Docker
      host: true,
      port: 5173,
      // Polling necessário para hot reload com volume montado no Docker/Windows
      watch: env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true } : undefined,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:8080',
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' }
      ]
    }
  }
})
