import { useRef } from 'react'
import { useAddGraphComponent, useGraphComponent } from './GraphComponentContext.ts'

/**
 * Renders the yFiles graph canvas.
 *
 * This component does not know how the GraphComponent was created —
 * it simply reads it from context and attaches it to a container div.
 */
export function GraphView() {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mount graphComponent.htmlElement into our container div.
  useAddGraphComponent(containerRef, graphComponent)

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
