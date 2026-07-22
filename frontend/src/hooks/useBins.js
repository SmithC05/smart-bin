import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import { usePolling } from '../context/PollingContext'
import { useBinWebSocket } from './useWebSocket'

// ─── useDashboard ─────────────────────────────────────────────────────────────
export function useDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const { start, stop }       = usePolling()

  const fetch = useCallback(async () => {
    try {
      start()
      setLoading(true)
      const res = await api.get('/dashboard/')
      setData(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      stop()
    }
  }, [start, stop])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 10000)
    return () => clearInterval(interval)
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useBins ──────────────────────────────────────────────────────────────────
export function useBins() {
  const [bins, setBins]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const { start, stop }       = usePolling()

  const fetch = useCallback(async () => {
    try {
      start()
      setLoading(true)
      const res = await api.get('/bins/')
      setBins(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      stop()
    }
  }, [start, stop])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 10000)
    return () => clearInterval(interval)
  }, [fetch])

  return { bins, loading, error, refetch: fetch }
}

// ─── useAlerts ────────────────────────────────────────────────────────────────
export function useAlerts() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const { start, stop }       = usePolling()

  const fetch = useCallback(async () => {
    try {
      start()
      const res = await api.get('/alerts/')
      setAlerts(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      stop()
    }
  }, [start, stop])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [fetch])

  return { alerts, loading, error, refetch: fetch }
}

export function useRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/routes/')
      setRoutes(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { routes, loading, error, refetch: fetch }
}

export function useLiveBins() {
  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [flashId, setFlashId] = useState(null)
  const { setWsActive } = usePolling()

  const fetch = useCallback(() => {
    api.get('/bins/')
      .then((res) => {
        setBins(res.data)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleMessage = useCallback((payload) => {
    setBins((prev) => prev.map((b) => (
      b.bin_id === payload.bin_id
        ? {
            ...b,
            latest_pct: payload.fill_pct,
            status: payload.status,
            last_seen: payload.last_seen,
          }
        : b
    )))

    setLastUpdated(new Date())
    setFlashId(payload.bin_id)
    setWsActive(true)

    setTimeout(() => setFlashId(null), 1500)
    setTimeout(() => setWsActive(false), 2000)
  }, [setWsActive])

  useBinWebSocket(handleMessage)

  return { bins, loading, error, lastUpdated, flashId, refetch: fetch }
}
