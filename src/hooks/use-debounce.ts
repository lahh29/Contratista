import { useState, useEffect } from "react"

/**
 * Delays updating a value until `delay` ms have passed without change.
 * Useful for search inputs to avoid firing on every keystroke.
 *
 * @example
 * const debouncedQuery = useDebounce(searchTerm, 300)
 * // use debouncedQuery in useMemo/useEffect instead of searchTerm
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
