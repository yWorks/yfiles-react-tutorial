import { type IGraph, Size } from '@yfiles/yfiles'

/**
 * Populates the given graph with a small component-dependency tree.
 *
 * We use the IGraph interface to create nodes and edges directly.
 * IGraph acts as the factory: it creates elements and owns them.
 */
export function buildGraph(graph: IGraph): void {
  // nodeDefaults.size controls the dimensions of every node created afterwards.
  graph.nodeDefaults.size = new Size(120, 40)

  // createNode() returns an INode reference we keep to wire up edges later.
  // Passing a labels array adds a text label to the node in one step.
  const app = graph.createNode({ labels: ['App'] })
  const router = graph.createNode({ labels: ['Router'] })
  const store = graph.createNode({ labels: ['Store'] })
  const header = graph.createNode({ labels: ['Header'] })
  const dashboard = graph.createNode({ labels: ['Dashboard'] })
  const settings = graph.createNode({ labels: ['Settings'] })
  const api = graph.createNode({ labels: ['API Client'] })

  // createEdge(source, target) creates a directed connection between two nodes.
  graph.createEdge(app, router)
  graph.createEdge(app, store)
  graph.createEdge(app, header)
  graph.createEdge(router, dashboard)
  graph.createEdge(router, settings)
  graph.createEdge(store, api)
  graph.createEdge(dashboard, api)
}
