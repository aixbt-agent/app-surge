import { useEffect, useState } from 'react'

function isErrorPayload(value: unknown): value is { error: string } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'error' in value &&
    typeof (value as { error?: unknown }).error === 'string',
  )
}

function shouldUseFallback<T>(value: unknown, fallback: T): boolean {
  if (isErrorPayload(value)) {
    return true
  }

  if (Array.isArray(fallback)) {
    return !Array.isArray(value)
  }

  return false
}

export function useFetch<T>(url: string, fallback?: T): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        const rows = json.rows || json
        if (!mounted) return

        if (fallback !== undefined && shouldUseFallback(rows, fallback)) {
          setError(isErrorPayload(rows) ? rows.error : null)
          setData(fallback)
          return
        }

        setError(null)
        setData(Array.isArray(rows) && rows.length === 0 && fallback !== undefined ? fallback : rows)
      } catch (e: any) {
        if (mounted) {
          setError(e.message)
          if (fallback !== undefined) setData(fallback)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 300000)
    return () => { mounted = false; clearInterval(interval) }
  }, [url])
  return { data, loading, error }
}
