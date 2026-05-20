import { useEffect, useMemo } from 'react'
import { GraphBuilder, GraphComponent, HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'
import type { NodeData, EdgeData, GraphData } from './types.ts'
import { getNodeStyle } from './styles.ts'

function createGraphBuilder(graphComponent: GraphComponent) {
  const builder = new GraphBuilder(graphComponent.graph)

  const nodesSource = builder.createNodesSource<NodeData>([] as NodeData[], (item) => item.id)

  nodesSource.nodeCreator.createLabelBinding((item) => item.name)
  nodesSource.nodeCreator.tagProvider = (item) => item

  // styleProvider is called once per data item when a node is created,
  // and again on updateGraph() if the item's data has changed.
  // It receives the full data item and returns a complete style instance.
  // Returning a new instance each time ensures nodes never share style objects.
  nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)

  const edgesSource = builder.createEdgesSource<EdgeData>(
    [] as EdgeData[],
    (item) => item.fromNode,
    (item) => item.toNode,
  )
  edgesSource.edgeCreator.tagProvider = (item) => item

  return { builder, nodesSource, edgesSource }
}

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0.5s',
    animateViewport: true,
  }).start()
}

export function useGraphBuilder(graphComponent: GraphComponent, graphData: GraphData): void {
  const { builder, nodesSource, edgesSource } = useMemo(
    () => createGraphBuilder(graphComponent),
    [graphComponent],
  )

  useEffect(() => {
    builder.setData(nodesSource, graphData.nodesSource)
    builder.setData(edgesSource, graphData.edgesSource)
    builder.updateGraph()
    void applyLayout(graphComponent)
  }, [graphComponent, builder, nodesSource, edgesSource, graphData])
}
