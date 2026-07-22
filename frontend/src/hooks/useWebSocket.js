import { useEffect, useRef, useCallback } from 'react'

const WS_URL = 'ws://localhost:8000/ws/bins/'

export function useBinWebSocket(onMessage) {
  const wsRef = useRef(null)
  const retryRef = useRef(null)
  const shouldReconnectRef = useRef(true)

  const connect = useCallback(() => {
    shouldReconnectRef.current = true
    wsRef.current = new WebSocket(WS_URL)

    wsRef.current.onopen = () => {
      console.log('[SmartBin WS] connected')
    }

    wsRef.current.onmessage = (e) => {
      const payload = JSON.parse(e.data)
      if (payload.type !== 'connected') {
        onMessage(payload)
      }
    }

    wsRef.current.onclose = () => {
      if (!shouldReconnectRef.current) return
      console.log('[SmartBin WS] closed - retry in 3s')
      retryRef.current = setTimeout(connect, 3000)
    }

    wsRef.current.onerror = () => {
      wsRef.current?.close()
    }
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => {
      shouldReconnectRef.current = false
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
