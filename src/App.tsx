import React, { useState, useEffect } from 'react'
import { TrendingUp, ExternalLink, X, ChevronRight } from 'lucide-react'
import { Badge, Label, SlidePanel, SkeletonBar } from '@aixbt-agent/components'
import { useFetch } from './lib/useFetch'
import { useIsMobile } from './lib/useIsMobile'

const C = {
  bg: 'var(--c-bg)',
  surface: 'var(--c-surface)',
  dim: 'var(--c-dim)',
  text: 'var(--c-text)',
  secondary: 'var(--c-secondary)',
  muted: 'var(--c-muted)',
  accent: 'var(--c-accent)',
  green: 'var(--c-green)',
  red: 'var(--c-red)',
  yellow: 'var(--c-yellow)',
  blue: 'var(--c-blue)',
  purple: 'var(--c-purple)',
}

interface Project {
  id: string; name: string; description: string; xHandle: string
  symbol: string; categories: string[]; price: number; marketCap: number
  volume24h: number; change24h: number; chains: string[]
}

interface DeepSearch {
  project_id: string; project_name: string; analysis: string
  one_liner: string; expires_at: string
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function fmtPrice(n: number): string {
  if (n === 0) return '--'
  if (n < 0.01) return `$${n.toFixed(6)}`
  if (n < 1) return `$${n.toFixed(4)}`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProjectRow({ project, oneLiner, onClick }: { project: Project; oneLiner: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderBottom: '1px solid rgba(47,51,54,0.5)', cursor: 'pointer', transition: 'background 150ms ease-out',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: C.text }}>{project.name}</span>
          {project.symbol && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: C.muted }}>{project.symbol.toUpperCase()}</span>}
          {project.marketCap > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: C.muted, marginLeft: 'auto', flexShrink: 0 }}>{fmt(project.marketCap)}</span>}
        </div>
        {oneLiner && (
          <div style={{ fontSize: 'var(--fs-xs)', color: C.secondary, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oneLiner}</div>
        )}
      </div>
      <ChevronRight size={16} color={C.muted} style={{ flexShrink: 0 }} />
    </div>
  )
}

function DetailPanel({ project, onClose, deepSearch }: { project: Project | null; onClose: () => void; deepSearch: DeepSearch | null }) {
  const mobile = useIsMobile()

  if (!project) return null

  const analysis = deepSearch?.analysis || null
  const isExpired = deepSearch ? new Date(deepSearch.expires_at) < new Date() : true

  return (
    <SlidePanel open={!!project} onClose={onClose} width={mobile ? 360 : 440}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: C.text }}>{project.name}</div>
          {project.symbol && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: C.muted }}>{project.symbol.toUpperCase()}</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color={C.secondary} /></button>
      </div>
      <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
        {project.price > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>{fmtPrice(project.price)}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>24h</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: project.change24h >= 0 ? C.green : C.red, letterSpacing: '-0.02em' }}>
                {project.change24h >= 0 ? '+' : ''}{project.change24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Cap</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', color: C.text }}>{fmt(project.marketCap)}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volume</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', color: C.text }}>{fmt(project.volume24h)}</div>
            </div>
          </div>
        )}
        {project.chains.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {project.chains.map(c => <Badge key={c} text={c} />)}
          </div>
        )}
        {project.xHandle && (
          <div style={{ marginBottom: 16 }}>
            <a href={`https://x.com/${project.xHandle}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 'var(--fs-sm)', color: C.blue, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              @{project.xHandle} <ExternalLink size={12} />
            </a>
          </div>
        )}
        <Label text="Deep Search Analysis" />
        {analysis ? (
          <>
            {isExpired && (
              <div style={{ fontSize: 'var(--fs-xs)', color: C.yellow, marginBottom: 8 }}>stale — refresh pending</div>
            )}
            <div style={{ fontSize: 'var(--fs-sm)', color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{analysis}</div>
          </>
        ) : (
          <div style={{ fontSize: 'var(--fs-sm)', color: C.muted }}>Deep search pending. Analysis will be available shortly.</div>
        )}
      </div>
    </SlidePanel>
  )
}

export default function App() {
  const { data, loading, error } = useFetch<{ projects: Project[] }>('/api/surge', { projects: [] })
  const [selected, setSelected] = useState<Project | null>(null)
  const [searches, setSearches] = useState<DeepSearch[]>([])
  const projects = data?.projects || []

  useEffect(() => {
    fetch('/api/data/deep_search')
      .then(r => r.json())
      .then(d => {
        const rows = d.rows || d
        if (Array.isArray(rows)) setSearches(rows)
      })
      .catch(() => {})
  }, [])

  const getSearch = (id: string) => searches.find(s => s.project_id === id.toLowerCase()) || null
  const getOneLiner = (id: string) => getSearch(id)?.one_liner || ''

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <nav style={{ background: '#000', borderBottom: '1px solid var(--c-dim)', display: 'flex', alignItems: 'center', height: 48, padding: '0 16px', flexShrink: 0, gap: 10 }}>
        <TrendingUp size={18} color={C.text} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: C.text }}>crypto lite</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: C.muted, marginLeft: 'auto' }}>top surging projects</span>
      </nav>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && !projects.length ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><SkeletonBar width="40%" height={16} /><SkeletonBar width="80%" height={12} /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 16, color: C.red, fontSize: 'var(--fs-sm)' }}>failed to load surging projects</div>
        ) : (
          projects.map((p) => <ProjectRow key={p.id} project={p} oneLiner={getOneLiner(p.id)} onClick={() => setSelected(p)} />)
        )}
      </div>
      {selected && <div onClick={() => setSelected(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9 }} />}
      <DetailPanel project={selected} onClose={() => setSelected(null)} deepSearch={selected ? getSearch(selected.id) : null} />
    </div>
  )
}
