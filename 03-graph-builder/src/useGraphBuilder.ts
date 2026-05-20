import { useEffect, useMemo } from 'react'
import {
  GraphBuilder,
  GraphComponent,
  HierarchicalLayout,
  LayoutExecutor,
  type IGraph,
} from '@yfiles/yfiles'
import type { NodeData, EdgeData, GraphData } from './types.ts'

// ---------------------------------------------------------------------------
// Builder factory
// ---------------------------------------------------------------------------

function createGraphBuilder(graph: IGraph) {
  const builder = new GraphBuilder(graph)

  // createNodesSource tells the builder:
  //  - which array to read nodes from (starts empty here)
  //  - how to derive a stable ID from each data item (used to match
  //    items across updateGraph() calls without rebuilding from scratch)
  const nodesSource = builder.createNodesSource<NodeData>([] as NodeData[], (item) => item.id)

  // createLabelBinding maps a data property to the node's visible label.
  nodesSource.nodeCreator.createLabelBinding((item) => item.name)

  // createEdgesSource tells the builder which array holds edge data and
  // how to resolve source/target node IDs from each edge data item.
  const edgesSource = builder.createEdgesSource<EdgeData>(
    [] as EdgeData[],
    (item) => item.fromNode,
    (item) => item.toNode,
  )

  return { builder, nodesSource, edgesSource }
}

// ---------------------------------------------------------------------------
// Layout helper
// ---------------------------------------------------------------------------

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Keeps the graph in sync with `graphData`.
 *
 * - Creates a GraphBuilder once (tied to the stable graphComponent instance).
 * - Calls setData + updateGraph whenever graphData changes.
 * - Applies an animated layout after each update.
 */
export function useGraphBuilder(graphComponent: GraphComponent, graphData: GraphData): void {
  // useMemo creates the builder once per graphComponent instance.
  // Since graphComponent comes from GraphComponentProvider (useMemo []),
  // it is stable — so the builder is effectively created once for the app's
  // lifetime.
  const { builder, nodesSource, edgesSource } = useMemo(
    () => createGraphBuilder(graphComponent.graph),
    [graphComponent],
  )

  // Sync data → graph on every graphData change.
  // Also runs on first mount (after the builder is created).
  useEffect(() => {
    // Replace the data collections on each source …
    builder.setData(nodesSource, graphData.nodesSource)
    builder.setData(edgesSource, graphData.edgesSource)

    // … then tell the builder to reconcile the graph with the new data.
    // On the first call this acts like buildGraph(). On subsequent calls
    // it performs an incremental update: nodes/edges present in the previous
    // data are reused, and only additions/removals are applied.
    builder.updateGraph()

    void applyLayout(graphComponent)
  }, [graphComponent, builder, nodesSource, edgesSource, graphData])
}
