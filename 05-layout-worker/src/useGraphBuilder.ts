import { useEffect, useMemo } from 'react'
import { GraphBuilder, GraphComponent, LayoutExecutorAsync } from '@yfiles/yfiles'
import type { NodeData, EdgeData, GraphData } from './types.ts'
import { getNodeStyle } from './styles.ts'

function createGraphBuilder(graphComponent: GraphComponent) {
  const builder = new GraphBuilder(graphComponent.graph)

  const nodesSource = builder.createNodesSource<NodeData>([] as NodeData[], (item) => item.id)

  nodesSource.nodeCreator.createLabelBinding((item) => item.name)
  nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)
  nodesSource.nodeCreator.tagProvider = (item) => item

  const edgesSource = builder.createEdgesSource<EdgeData>(
    [] as EdgeData[],
    (item) => item.fromNode,
    (item) => item.toNode,
  )
  edgesSource.edgeCreator.tagProvider = (item) => item

  return { builder, nodesSource, edgesSource }
}

export function useGraphBuilder(graphComponent: GraphComponent, graphData: GraphData): void {
  const { builder, nodesSource, edgesSource } = useMemo(
    () => createGraphBuilder(graphComponent),
    [graphComponent],
  )

  // Create the worker once.  Vite's `new URL(…, import.meta.url)` syntax
  // tells the bundler to treat the file as a separate entry point and emit
  // it as a separate chunk, exactly as a web worker needs.
  const worker = useMemo(
    () => new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' }),
    [],
  )

  // Create the executor once and reuse it for every layout run.
  //
  // This is important: createWebWorkerMessageHandler sets up a message
  // channel on the worker instance.  Creating a new LayoutExecutorAsync
  // (and therefore a new message handler) on every layout call registers
  // multiple competing listeners on the same worker, so responses can be
  // routed to the wrong executor — causing layouts to hang indefinitely.
  const executor = useMemo(
    () =>
      new LayoutExecutorAsync({
        messageHandler: LayoutExecutorAsync.createWebWorkerMessageHandler(worker),
        graphComponent,
        animationDuration: '0.5s',
        animateViewport: true,
      }),
    [graphComponent, worker],
  )

  // NOTE: We intentionally do NOT call worker.terminate() in a useEffect
  // cleanup.  React 18 Strict Mode simulates unmount/remount in dev —
  // terminate() would kill the worker during the simulated unmount, but
  // useMemo still holds the (now dead) worker reference on remount.
  // Every subsequent executor.start() would post messages to a terminated
  // worker that never responds, causing layouts to hang indefinitely.
  // The worker is garbage-collected when the page unloads.

  useEffect(() => {
    builder.setData(nodesSource, graphData.nodesSource)
    builder.setData(edgesSource, graphData.edgesSource)
    builder.updateGraph()
    // Reuse the stable executor — no new instance per call.
    void executor.start()
  }, [builder, nodesSource, edgesSource, graphData, executor])
}
