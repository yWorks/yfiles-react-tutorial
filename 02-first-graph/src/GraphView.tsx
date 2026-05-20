import { useEffect, useRef } from 'react'
import { HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'
import { useAddGraphComponent, useGraphComponent } from './GraphComponentContext.ts'
import { buildGraph } from './buildGraph.ts'

/**
 * Renders the yFiles graph canvas and populates it with a static graph.
 *
 * The GraphComponent comes from context — this component only needs to
 * mount the canvas and trigger the one-time graph initialisation.
 */
export function GraphView() {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  // Mount graphComponent.htmlElement into our container div.
  useAddGraphComponent(containerRef, graphComponent)

  // Build graph content and apply layout once, when the component mounts.
  useEffect(() => {
    buildGraph(graphComponent.graph)
    void applyLayout(graphComponent)
  }, [graphComponent])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

/**
 * Arranges all nodes using HierarchicalLayout.
 *
 * LayoutExecutor is asynchronous — the algorithm runs without blocking the
 * browser and animates the transition from old positions to new ones.
 */
async function applyLayout(graphComponent: import('@yfiles/yfiles').GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0s', // no animation on initial load
    animateViewport: true, // fit the graph into the viewport when done
  }).start()
}
