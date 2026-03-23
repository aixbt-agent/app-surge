// Crypto Lite SSR: serves live surging projects with deep search from db cache
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createAppData } from '@aixbt-agent/runtime'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = parseInt(process.env.PORT || '3105')
const data = createAppData('aixbt-surge')

data.mount(app)

interface CacheEntry<T> { data: T; expires: number }
let surgeCache: CacheEntry<any[]> | null = null
const searchCache = new Map<string, CacheEntry<string>>()
const SURGE_TTL = 10 * 60 * 1000

function parsePgArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string' || value === '{}') return []
  const inner = value.slice(1, -1)
  const items: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (c === '"') { inQuote = !inQuote; continue }
    if (c === '\\' && inQuote) { i++; current += inner[i] ?? ''; continue }
    if (c === ',' && !inQuote) { if (current) items.push(current); current = ''; continue }
    current += c
  }
  if (current) items.push(current)
  return items
}

// surge_list is populated hourly by refresh-surge-list (with hasToken=true filter)
app.get('/api/surge', async (_req, res) => {
  if (surgeCache && surgeCache.expires > Date.now()) {
    return res.json({ projects: surgeCache.data, cached: true })
  }
  try {
    const rows = await data.table<any>('surge_list')
      .where({ order_by: 'last_seen_at', order: 'desc' })
      .list({ limit: 10 })
    const result = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      xHandle: r.x_handle ?? '',
      symbol: r.symbol ?? '',
      categories: parsePgArray(r.categories),
      price: parseFloat(r.price_usd) || 0,
      marketCap: parseFloat(r.market_cap) || 0,
      volume24h: parseFloat(r.volume_24h) || 0,
      change24h: parseFloat(r.change_24h) || 0,
      chains: parsePgArray(r.chains),
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
app.listen(port, () => console.log(`crypto lite v2 listening on ${port}`))
