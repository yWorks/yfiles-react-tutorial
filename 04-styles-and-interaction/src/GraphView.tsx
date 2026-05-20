import { useRef } from 'react'
import { useAddGraphComponent, useGraphComponent } from './GraphComponentContext.ts'
import { useGraphBuilder } from './useGraphBuilder.ts'
import { useCurrentItem } from './useCurrentItem.ts'
import { InfoPanel } from './InfoPanel.tsx'
import type { GraphData } from './types.ts'

interface Props {
  graphData: GraphData
}

/**
 * Renders the yFiles graph canvas and keeps it in sync with graphData.
 *
 * This component has no knowledge of the GraphComponent's lifecycle —
 * it simply reads it from context and attaches it to a container div.
 */
export function GraphView({ graphData }: Props) {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mount graphComponent.htmlElement into our container div.
  useAddGraphComponent(containerRef, graphComponent)

  // Keep the graph in sync with the data passed from above.
  useGraphBuilder(graphComponent, graphData)

  // Mirror the GraphComponent's current item into React state.
  // Re-renders only when the user clicks a different element.
  const currentItem = useCurrentItem(graphComponent)

  // position: relative makes the InfoPanel's absolute positioning
  // relative to this container, not the page.
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <InfoPanel item={currentItem} />
    </div>
  )
}
