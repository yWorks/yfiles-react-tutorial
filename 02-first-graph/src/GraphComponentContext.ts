import { createContext, useContext, useLayoutEffect, type RefObject } from 'react'
import { GraphComponent } from '@yfiles/yfiles'

// The context holds a single GraphComponent instance (or null when used
// outside a provider, which we treat as a programming error).
export const GraphComponentContext = createContext<GraphComponent | null>(null)

/**
 * Returns the GraphComponent from the nearest GraphComponentProvider.
 * Throws if called outside a provider — this makes misconfiguration
 * immediately visible rather than silently passing null around.
 */
export function useGraphComponent(): GraphComponent {
  const gc = useContext(GraphComponentContext)
  if (!gc) {
    throw new Error('useGraphComponent must be called inside a <GraphComponentProvider>.')
  }
  return gc
}

/**
 * Attaches the GraphComponent's root DOM element to the given container ref.
 *
 * Uses useLayoutEffect (not useEffect) so the element is in the DOM
 * synchronously after every render — preventing a single-frame flash of
 * empty space that useEffect (which fires after paint) would cause.
 */
export function useAddGraphComponent(
  containerRef: RefObject<HTMLDivElement | null>,
  graphComponent: GraphComponent,
): void {
  useLayoutEffect(() => {
    // Capture current so the cleanup closure always refers to the same element,
    // even if the ref becomes null after the component unmounts.
    const container = containerRef.current
    if (!container) return

    container.appendChild(graphComponent.htmlElement)

    return () => {
      container.removeChild(graphComponent.htmlElement)
    }
  }, [containerRef, graphComponent])
}
