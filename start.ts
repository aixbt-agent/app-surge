// Surge scanner SSR v3: serves live surging projects with web-based deep search
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createAppData } from '@aixbt-agent/runtime'

const BASE = 'https://api.aixbt.tech/v2'
const API_KEY = process.env.AIXBT_API_KEY || ''

async function aixbtFetch(apiPath: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${apiPath}`, {
    ...opts,
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  })
  if (!res.ok) throw new Error(`AIXBT ${apiPath} -> ${res.status}`)
  return res.json()
}

async function fetchSurging(limit = 10) {
  const data = await aixbtFetch(`/projects?limit=${limit}&sortBy=momentumScore&excludeStables=true`)
  return data.data || []
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = parseInt(process.env.PORT || '3106')
const data = createAppData('aixbt-surge')

data.mount(app)

interface CacheEntry<T> { data: T; expires: number }
let surgeCache: CacheEntry<any[]> | null = null
const searchCache = new Map<string, CacheEntry<string>>()
const SURGE_TTL = 10 * 60 * 1000

app.get('/api/surge', async (_req, res) => {
  if (surgeCache && surgeCache.expires > Date.now()) {
    return res.json({ projects: surgeCache.data, cached: true })
  }
  try {
    const projects = await fetchSurging(10)
    const result = projects.map((p: any) => ({
      id: p.id, name: p.name, description: p.description, xHandle: p.xHandle,
      symbol: p.coingeckoData?.symbol || '', categories: p.coingeckoData?.categories || [],
      price: p.metrics?.usd || 0, marketCap: p.metrics?.usdMarketCap || 0,
      volume24h: p.metrics?.usd24hVol || 0, change24h: p.metrics?.usd24hChange || 0,
      chains: (p.tokens || []).map((t: any) => t.chain),
    }))
    surgeCache = { data: result, expires: Date.now() + SURGE_TTL }
    res.json({ projects: result, cached: false })
  } catch (err: any) {
    console.error('surge fetch error:', err?.message || err)
    res.status(500).json({ error: 'Failed to fetch surging projects' })
  }
})

app.get('/api/search/:projectId', async (req, res) => {
  const { projectId } = req.params

  const cached = searchCache.get(projectId)
  if (cached && cached.expires > Date.now()) return res.json({ analysis: cached.data, cached: true })

  try {
    const result = await data.table<any>('deep_search').where({ project_id: projectId }).first()
    if (result && new Date(result.expires_at) > new Date()) {
      searchCache.set(projectId, { data: result.analysis, expires: new Date(result.expires_at).getTime() })
      return res.json({ analysis: result.analysis, cached: true })
    }
  } catch {}

  res.json({ analysis: 'Deep search pending. Analysis will be available shortly.', pending: true })
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
app.listen(port, () => console.log(`surge scanner v3 listening on ${port}`))
