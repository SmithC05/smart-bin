import { createContext, useContext, useState, useCallback } from 'react'

/**
 * PollingContext
 * Tracks how many fetches are currently in-flight.
 * Topbar reads `isFetching` to animate the Live dot.
 */
const PollingContext = createContext({
  isFetching: false,
  wsActive: false,
  setWsActive: () => {},
  start: () => {},
  stop: () => {},
})

export function PollingProvider({ children }) {
  const [count, setCount] = useState(0)
  const [wsActive, setWsActive] = useState(false)
  const start = useCallback(() => setCount((c) => c + 1), [])
  const stop  = useCallback(() => setCount((c) => Math.max(0, c - 1)), [])

  return (
    <PollingContext.Provider value={{ isFetching: count > 0 || wsActive, wsActive, setWsActive, start, stop }}>
      {children}
    </PollingContext.Provider>
  )
}

export function usePolling() {
  return useContext(PollingContext)
}
