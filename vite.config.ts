import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'node:path'

export default defineConfig({
  optimizeDeps: {
    exclude: ['vant', '@vant/use', '@vant/icons']
  },
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [VantResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [VantResolver()],
      dts: 'src/components.d.ts'
    }),
    // SVG 图标自动注册
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      symbolId: 'icon-[name]'
    }),
    // 图片代理插件，用于 ColorThief 跨域提取主导色
    {
      name: 'img-proxy',
      configureServer(server) {
        server.middlewares.use('/img-proxy', async (req, res) => {
          const raw = (req.url || '').replace(/^\//, '')
          const target = decodeURIComponent(raw)
          if (!target || !(target.startsWith('https://') || target.startsWith('http://'))) {
            res.statusCode = 400
            res.end('Bad request')
            return
          }
          try {
            const resp = await fetch(target, {
              headers: { 'User-Agent': 'Mozilla/5.0', Referer: target }
            })
            if (!resp.ok) {
              res.statusCode = resp.status
              res.end()
              return
            }
            const ct = resp.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)
            res.setHeader('Cache-Control', 'public, max-age=86400')
            const buf = Buffer.from(await resp.arrayBuffer())
            res.end(buf)
          } catch {
            res.statusCode = 502
            res.end()
          }
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    host: true,
    port: 7654,
    proxy: {
      '/api/music/migu': {
        target: 'https://api.xcvts.cn',
        changeOrigin: true
      },
      // '/api/migu': {
      //   target: 'https://api.xcvts.cn',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api\/migu/, '/api/music/migu')
      // },
      '/api/netease': {
        target: 'https://api.vkeys.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/netease/, '/v2/music/netease')
      },
      '/api/lrc': {
        target: 'https://api.codetabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lrc/, '/v1/proxy/')
      }
    }
  },
  preview: {
    host: true,
    port: 7654
  },

  build: {
    // 每次构建前清空 dist
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 固定文件名，不带随机 hash
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          // CSS 统一输出为 app.css
          if (assetInfo.names?.some((n) => n.endsWith('.css'))) {
            return 'assets/app.css'
          }
          // 其他资源保留原名
          return 'assets/[name][extname]'
        }
      }
    }
  }
})
