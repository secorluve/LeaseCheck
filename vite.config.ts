import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { parseListingUrl } from './src/lib/parsers'
import { analyzeParsedListing } from './src/lib/analysis/analyzeParsedListing'
import type { IncomingMessage } from 'http'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks).toString('utf8')
  return body ? JSON.parse(body) : {}
}

function listingParserApiPlugin() {
  const methodNotAllowed = (res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }) => {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST' } }))
  }

  return {
    name: 'listing-parser-api',
    configureServer(server) {
      server.middlewares.use('/api/parse-listing', async (req, res) => {
        if (req.method !== 'POST') {
          methodNotAllowed(res)
          return
        }

        try {
          const body = await readJsonBody(req)
          const url = typeof body.url === 'string' ? body.url : ''
          const result = await parseListingUrl(url)
          res.statusCode = result.ok ? 200 : 422
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'parse_failed',
                message: 'Unexpected parser error.',
                recoverable: true,
                debug: { error: error instanceof Error ? error.message : 'unknown_error' },
              },
            }),
          )
        }
      })

      server.middlewares.use('/api/analyze-listing', async (req, res) => {
        if (req.method !== 'POST') {
          methodNotAllowed(res)
          return
        }

        try {
          const body = await readJsonBody(req)
          const url = typeof body.url === 'string' ? body.url : ''
          const parsed = await parseListingUrl(url)

          if (!parsed.ok) {
            res.statusCode = 422
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))
            return
          }

          const analyzed = await analyzeParsedListing(parsed.data)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(analyzed))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ok: false,
              error: {
                code: 'parse_failed',
                message: 'Unexpected analysis pipeline error.',
                recoverable: true,
                debug: { error: error instanceof Error ? error.message : 'unknown_error' },
              },
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    listingParserApiPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
