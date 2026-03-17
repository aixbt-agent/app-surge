// Shared data API proxy route for SSR app servers
import type { Express, Request, Response } from 'express'

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function normalizeBaseUrl(value: string | undefined, protocol: 'http' | 'https'): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `${protocol}://${trimmed}`
  return withProtocol.replace(/\/+$/, '')
}

export function getDataApiBase(): string {
  const railwayInternal = normalizeBaseUrl(process.env.RAILWAY_SERVICE_PROXY_URL, 'http')
  if (railwayInternal) {
    return railwayInternal
  }
  return process.env.NODE_ENV === 'production'
    ? 'http://proxy.railway.internal:3000'
    : 'http://localhost:3000'
}

function getDataRouteBase(namespace: string): string {
  return `${getDataApiBase()}/data/${namespace}`
}

export function createDataRouteHandler(namespace: string) {
  const base = getDataRouteBase(namespace)

  return async function dataRouteHandler(req: Request, res: Response) {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString()
      const url = `${base}/${req.params.table}${qs ? `?${qs}` : ''}`
      const r = await fetch(url)
      const data = await readJson(r)

      if (!r.ok) {
        res.status(r.status).json(
          data && typeof data === 'object'
            ? data
            : { error: `Data API request failed with status ${r.status}` },
        )
        return
      }

      res.json(data)
    } catch (err) {
      console.error('Data API error:', err)
      res.status(500).json({ error: 'Failed to fetch data' })
    }
  }
}

export function addDataRoute(app: Express, namespace: string) {
  app.get('/api/data/:table', createDataRouteHandler(namespace))
}
