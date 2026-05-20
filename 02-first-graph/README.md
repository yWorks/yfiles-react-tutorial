# Chapter 2: Displaying a Graph

## What you'll build

A React app that creates a small component-dependency [graph](https://docs.yworks.com/yfileshtml/dguide/graph/) in code and
arranges it automatically with yFiles' [`HierarchicalLayout`](https://docs.yworks.com/yfileshtml/dguide/hierarchical_layout/).

---

## Prerequisites

Completed [Chapter 1](../01-setup/README.md). This chapter introduces two new
concepts on top of the empty canvas from chapter 1: the **`IGraph` API** and
**automatic layout**.

---

## 1. The graph model: [`IGraph`](https://docs.yworks.com/yfileshtml/api/IGraph/)

In yFiles, the graph you see on screen is backed by a **graph model** — an
in-memory data structure that holds nodes, edges, labels, and ports.
The model is accessed through the `IGraph` interface.

You get the `IGraph` from the `GraphComponent`:

```ts
const graph: IGraph = graphComponent.graph
```

`IGraph` is also a **factory** — it is the simplest way to create elements that
belong to the graph:

```ts
const node = graph.createNode() // ✅ correct
const node = new INode() // ❌ does not exist
```

In the next chapter the [GraphBuilder](https://docs.yworks.com/yfileshtml/dguide/graph_builder/) is introduced, a more advanced and very flexible method to create and update a graph from data.

---

## 2. Creating nodes

`graph.createNode()` returns an `INode` reference. You need to hold on to it
to connect nodes with edges later.

### Setting a default size

Instead of specifying the size on every node, set it once on the defaults
object — then all subsequently created nodes will use that size. This is already
done in `GraphComponentProvider` from chapter 1:

```ts
gc.graph.nodeDefaults.size = new Size(140, 40)
```

### Adding labels

Use the **options-object overload** to add a label in the same call as node
creation:

```ts
const app = graph.createNode({ labels: ['App'] })
```

---

## 3. Creating edges

`graph.createEdge(source, target)` takes two `INode` references and creates a
directed edge between them:

```ts
graph.createEdge(app, router)
```

The edge's direction (source → target) is used by directional layout algorithms
like `HierarchicalLayout` to determine which node goes "higher" in the hierarchy.

---

## 4. Separating graph construction from the component

It is a good practice to keep graph building logic out of the React component.
Create a separate `buildGraph.ts` module that takes an `IGraph` and populates it:

```ts
// src/buildGraph.ts
import { type IGraph } from '@yfiles/yfiles'

export function buildGraph(graph: IGraph): void {
  const app = graph.createNode({ labels: ['App'] })
  const router = graph.createNode({ labels: ['Router'] })
  const store = graph.createNode({ labels: ['Store'] })
  const header = graph.createNode({ labels: ['Header'] })
  const dashboard = graph.createNode({ labels: ['Dashboard'] })
  const settings = graph.createNode({ labels: ['Settings'] })
  const api = graph.createNode({ labels: ['API Client'] })

  graph.createEdge(app, router)
  graph.createEdge(app, store)
  graph.createEdge(app, header)
  graph.createEdge(router, dashboard)
  graph.createEdge(router, settings)
  graph.createEdge(store, api)
  graph.createEdge(dashboard, api)
}
```

---

## 5. Applying a layout

Nodes created with `createNode()` are initially stacked at position `(0, 0)`.
A layout algorithm computes proper positions for all nodes and routes all edges.

yFiles provides the `LayoutExecutor` class to run a layout on a `GraphComponent`.

```ts
import { HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'

async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  await new LayoutExecutor({
    graphComponent,
    layout: new HierarchicalLayout(),
    animationDuration: '0s', // skip animation on first load
    animateViewport: true, // fit graph into the viewport when done
  }).start()
}
```

The LayoutExecutor is introduced here as it is needed in the last chapter, when the layout is calculated in a Web Worker. The _simplest_ way to run a layout and animate the elements to their propers calculated positions is:

```ts
async function applyLayout(graphComponent: GraphComponent): Promise<void> {
  return graphComponent.applyLayoutAnimated(new HierarchicalLayout())
}
```

### Why async? TODO!

Layout algorithms can be computationally expensive. Running them synchronously
would freeze the UI. `LayoutExecutor.start()` returns a `Promise` that resolves
when the layout (and any animation) is complete.

### `HierarchicalLayout`

`HierarchicalLayout` arranges nodes in horizontal or vertical layers, following
the direction of edges. It is well-suited for dependency graphs, flowcharts,
and trees.

---

## 6. Updating `GraphView`

Chapter 1's `GraphView` only mounted the canvas. Now it also initialises the
graph. The `GraphComponent` comes from context — `GraphView` calls
`useGraphComponent()`, then uses it to build the graph and run the layout:

```tsx
// src/GraphView.tsx
import { useEffect, useRef } from 'react'
import { HierarchicalLayout, LayoutExecutor } from '@yfiles/yfiles'
import { useAddGraphComponent, useGraphComponent } from './GraphComponentContext.ts'
import { buildGraph } from './buildGraph.ts'

export function GraphView() {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  useAddGraphComponent(containerRef, graphComponent)

  // Build graph content and apply layout once, when the component mounts.
  useEffect(() => {
    buildGraph(graphComponent.graph)
    void applyLayout(graphComponent)
  }, [graphComponent])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

The `void` prefix discards the `Promise` — that is fine here because this is
fire-and-forget initialization. The empty dependency array `[graphComponent]`
ensures this runs once (and `graphComponent` is stable from the provider's
`useMemo`).

---

## 7. `App.tsx` — unchanged

`App.tsx` is identical to chapter 1. The graph initialisation is entirely
inside `GraphView`, so `App` does not need to change:

```tsx
function App() {
  return (
    <GraphComponentProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <GraphView />
      </div>
    </GraphComponentProvider>
  )
}
```

---

## Key concepts

| Concept                      | Summary                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `graphComponent.graph`       | The `IGraph` instance — the graph model.                    |
| `graph.createNode()`         | Creates a node. Returns `INode`.                            |
| `graph.createEdge(src, tgt)` | Creates a directed edge. Returns `IEdge`.                   |
| `graph.nodeDefaults.size`    | Default size applied to all new nodes. Set in the provider. |
| `LayoutExecutor`             | Runs a layout algorithm and optionally animates it.         |
| `HierarchicalLayout`         | Arranges nodes in layers along edge direction.              |

---

## Next chapter

[Chapter 3: Loading Data with GraphBuilder →](../03-graph-builder/README.md)

Hard-coding nodes and edges works for toy examples, but real applications load
data from an API or a JSON file. In the next chapter we'll use `GraphBuilder`
to bind a JSON dataset to the graph declaratively, and update the graph
automatically when the data changes.
