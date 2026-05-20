# Chapter 3: Loading Data with GraphBuilder

## What you'll build

A graph that loads its structure from a JSON file and updates live when React
state changes. Two buttons demonstrate the update cycle:

- **Add Service** — appends a new node to the React state; the graph updates
  with an animated layout transition
- **Reset** — restores the original dataset

```
           ┌────────┐
           │ Client │
           └───┬────┘
               ▼
   ┌────────────────────────┐
   │       API Gateway      │
   └──┬────────┬─────────┬──┘
      ▼        ▼         ▼
  ┌──────┐ ┌──────┐ ┌─────────┐
  │ Auth │ │ User │ │ Product │  ← click "Add Service" to add more
  └──┬───┘ └──┬───┘ └────┬────┘
     └────────┴─┬────────┘
                ▼
          ┌──────────┐
          │ Database │
          └──────────┘
```

---

## Prerequisites

Completed [Chapter 2](../02-first-graph/README.md). This chapter replaces the
manual `IGraph` calls from chapter 2 with `GraphBuilder` — a declarative binding
layer between your application data and the graph.

---

## 1. Why GraphBuilder?

In chapter 2 we called `graph.createNode()` and `graph.createEdge()` directly.
That is fine for a static, hard-coded graph, but real applications load data
from an API or a file, and that data changes over time.

[`GraphBuilder`](https://docs.yworks.com/yfileshtml/dguide/graph_builder/) solves two problems:

1. **Mapping**: it knows how to turn an array of plain objects into graph
   elements, using a field you specify as the stable identity key.

2. **Incremental updates**: when the data changes, `GraphBuilder.updateGraph()`
   reconciles the graph with the new data — reusing existing nodes and edges
   where possible instead of rebuilding from scratch. This preserves custom
   state (positions, tags, styles) on unchanged items.

---

## 2. The data shape

`GraphBuilder` expects separate arrays for nodes and edges. For this chapter the
JSON file looks like this:

```json
{
  "nodesSource": [
    { "id": 1, "name": "Client" },
    { "id": 2, "name": "API Gateway" }
  ],
  "edgesSource": [{ "fromNode": 1, "toNode": 2 }]
}
```

The `id` field is used as the stable identity key. The `fromNode`/`toNode`
fields reference node IDs, not array indices — the builder resolves them.

---

## 3. Setting up the GraphBuilder

Create a `GraphBuilder` that operates on the `IGraph` from the `GraphComponent`.
Then register node and edge _sources_ — these describe how to read your data:

```ts
function createGraphBuilder(graph: IGraph) {
  const builder = new GraphBuilder(graph)

  // Arg 1: the data array (starts empty; we'll provide data via setData())
  // Arg 2: how to extract a stable ID from each data item
  const nodesSource = builder.createNodesSource<NodeData>([] as NodeData[], (item) => item.id)

  // Bind the node's visible label text to the 'name' field.
  nodesSource.nodeCreator.createLabelBinding((item) => item.name)

  // Arg 2: how to find the source node ID in an edge data item
  // Arg 3: how to find the target node ID in an edge data item
  const edgesSource = builder.createEdgesSource<EdgeData>(
    [] as EdgeData[],
    (item) => item.fromNode,
    (item) => item.toNode,
  )

  return { builder, nodesSource, edgesSource }
}
```

### Why start with empty arrays?

We pass `[]` here so we can always use the same `setData()` + `updateGraph()`
path — whether it is the first render or a later update. If you pass the real
data to `createNodesSource`, you'd call `buildGraph()` on the first render and
`updateGraph()` on subsequent ones. Starting empty keeps the flow uniform.

---

## 4. The build / update cycle

Once the sources are registered, populating or updating the graph is a two-step
call:

```ts
// Replace the data on each source …
builder.setData(nodesSource, graphData.nodesSource)
builder.setData(edgesSource, graphData.edgesSource)

// … then reconcile the graph with the new data.
builder.updateGraph()
```

**First call** (empty graph): `updateGraph()` acts like `buildGraph()` — it
creates all nodes and edges from the provided data.

**Subsequent calls**: `updateGraph()` performs a diff against what is already
in the graph. Nodes and edges whose IDs are still present in the data are
reused; new IDs cause new elements to be created; missing IDs cause removal.

---

## 5. Extracting the logic into `useGraphBuilder`

Instead of keeping the builder logic inside the component, we extract it into a
custom hook. This keeps `GraphView` small and focused on rendering:

```ts
// src/useGraphBuilder.ts
export function useGraphBuilder(graphComponent: GraphComponent, graphData: GraphData): void {
  // Create builder once — graphComponent is stable, so this memo never reruns.
  const { builder, nodesSource, edgesSource } = useMemo(
    () => createGraphBuilder(graphComponent.graph),
    [graphComponent],
  )

  // Sync data → graph on every change.
  useEffect(() => {
    builder.setData(nodesSource, graphData.nodesSource)
    builder.setData(edgesSource, graphData.edgesSource)
    builder.updateGraph()
    void applyLayout(graphComponent)
  }, [graphComponent, builder, nodesSource, edgesSource, graphData])
}
```

Because `graphComponent` comes from `useMemo([], [])` in the provider, it
is reference-stable. So `useMemo([graphComponent])` here runs exactly once
too, and the `useEffect` only fires when `graphData` changes.

---

## 6. Updating `GraphView`

`GraphView` now accepts `graphData` as a prop and delegates the sync logic to
`useGraphBuilder`:

```tsx
// src/GraphView.tsx
export function GraphView({ graphData }: Props) {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  useAddGraphComponent(containerRef, graphComponent)
  useGraphBuilder(graphComponent, graphData)

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

---

## 7. React integration: state in `App`, graph sync in the hook

The key design is that `graphData` is **plain React state**. Every time it
changes, `useGraphBuilder` syncs it to the graph automatically.

```tsx
function App() {
  const [graphData, setGraphData] = useState<GraphData>(initialData)

  function addService() {
    const newId = Math.max(...graphData.nodesSource.map((n) => n.id)) + 1
    setGraphData({
      nodesSource: [...graphData.nodesSource, { id: newId, name: `Service ${newId}` }],
      edgesSource: [
        ...graphData.edgesSource,
        { fromNode: 2, toNode: newId },
        { fromNode: newId, toNode: 6 },
      ],
    })
  }

  return (
    <GraphComponentProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
          <button onClick={addService}>Add Service</button>
          <button onClick={() => setGraphData(initialData)}>Reset</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <GraphView graphData={graphData} />
        </div>
      </div>
    </GraphComponentProvider>
  )
}
```

The graph update, including the animated layout, follows automatically — you
never touch the `IGraph` API directly in your event handler.

---

## Note on layout frequency

This chapter re-runs `HierarchicalLayout` after every `updateGraph()`. For
large graphs or rapid updates, you would instead use yFiles'
[incremental layout](https://docs.yworks.com/yfileshtml/#/dguide/layout-incremental_layout)
mode, which only repositions the elements that changed. For the tutorial's small
graphs, a full re-layout is fine and visually demonstrates the update cycle
clearly.

---

## Key concepts

| Concept                                 | Summary                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `GraphBuilder`                          | Declarative bridge between data arrays and the graph model.              |
| `createNodesSource(data, idProvider)`   | Registers a nodes data array and its ID accessor.                        |
| `createEdgesSource(data, srcId, tgtId)` | Registers an edges data array and its endpoint accessors.                |
| `createLabelBinding(fn)`                | Maps a data field to a node/edge label.                                  |
| `setData(source, newArray)`             | Replaces the data on a registered source before an update.               |
| `updateGraph()`                         | Reconciles the graph with the current data. Incremental on repeat calls. |
| `useMemo` for builder                   | Holds the builder instance stable across re-renders.                     |
| `useGraphBuilder` hook                  | Encapsulates the data-sync logic; keeps `GraphView` clean.               |

---

## Next chapter

[Chapter 4: Styles →](../04-styles/README.md)

The graph has been plain grey boxes so far. In the next chapter we'll use
`ShapeNodeStyle` and `PolylineEdgeStyle` to give nodes and edges distinct
visual identities, bind style properties to data fields, and add click
feedback with an overlay panel.
