import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import { usePolling } from '../context/PollingContext'

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
