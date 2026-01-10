import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    proxy: {
      // Proxy any request starting with /openapi to the Cloud Function host during dev
      '/openapi': {
        target: 'https://rqopkcftnc.execute-api.ap-northeast-1.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openapi/, '/openapi'),
      },
    },
  },
})
