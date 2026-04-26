import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawApiBase = String(env.VITE_API_BASE_URL || '').trim()
  const documentsBackend = String(env.VITE_DOCUMENTS_BACKEND || 'local').toLowerCase()
  const isAbsoluteApiBase = /^https?:\/\//i.test(rawApiBase)

  if (mode === 'production' && !rawApiBase) {
    throw new Error('VITE_API_BASE_URL is required for production builds to reach profeia/server.')
  }

  if (mode === 'production' && documentsBackend === 'local' && !isAbsoluteApiBase) {
    throw new Error('With VITE_DOCUMENTS_BACKEND=local in production, VITE_API_BASE_URL must be an absolute backend URL.')
  }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    }
  }
})
