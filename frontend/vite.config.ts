import http from 'node:http'
import { defineConfig, type Plugin, type PreviewServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * پروکسی /api در حالت preview — تا build تولیدی با URL نسبی هم
 * در محیط‌های میزبانی‌شده (iframe/preview) کار کند؛ درخواست همان-origin
 * است و سرور اینجا آن را به بک‌اند محلی :4000 پاس می‌دهد.
 * فقط ابزار توسعه/دمو است — در استقرار واقعی، nginx و امثال آن همین نقش را دارند.
 */
function apiProxyPreview(): Plugin {
  return {
    name: 'preview-api-proxy',
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api',
        (req: http.IncomingMessage, res: http.ServerResponse, _next: () => void) => {
          const upstream = http.request(
            {
              host: '127.0.0.1',
              port: 4000,
              method: req.method,
              path: '/api' + (req.url ?? ''),
              headers: req.headers,
            },
            (up: http.IncomingMessage) => {
              res.writeHead(up.statusCode ?? 502, up.headers)
              up.pipe(res)
            },
          )
          upstream.on('error', () => {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ success: false, message: 'ارتباط با سرور برقرار نشد' }))
          })
          req.pipe(upstream)
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiProxyPreview()],
  server: {
    host: true, // 0.0.0.0 — دسترسی preview
    port: 5173,
    strictPort: true,
    // پذیرش هاست preview سندباکس (زیردامنه‌ی e2b.app)
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    // پذیرش هاست preview سندباکس (همتای server.allowedHosts بالا)
    allowedHosts: ['.e2b.app'],
  },
})
