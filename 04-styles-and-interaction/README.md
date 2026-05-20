# Chapter 4: Styles and Interaction

## What you'll build

The same microservices graph as chapter 3, now with data-driven visual styles
and interactive click feedback:

- Each node category gets a distinct shape and color
- Edges get a clean arrow style with rounded bends
- Node labels are rendered in white text
- Clicking a node or edge shows an overlay panel with item details
- A toolbar provides zoom controls without any prop-drilling

| Node type  | Shape           | Color           |
| ---------- | --------------- | ---------------- |
| `client`   | rectangle       | blue `#3d72c8`   |
| `gateway`  | round-rectangle | amber `#e08c00`  |
| `service`  | round-rectangle | teal `#0f9c99`   |
| `database` | hexagon         | purple `#6a3fb5` |

---

## Prerequisites

Completed [Chapter 3](../03-graph-builder/README.md). This chapter builds
on the Provider/Context architecture from chapters 1–3. New concepts are
yFiles style APIs, toolbar commands, and bridging yFiles events to React state.

---

## 1. Extending the data model

The first step is to add a `type` discriminator to `NodeData`:

```ts
// src/types.ts
export type NodeType = 'client' | 'gateway' | 'service' | 'database'

export interface NodeData {
  id: number
  name: string
  type: NodeType // ← new
}
```

And add the field to every node in the data file:

```json
// src/graph-data.json
{ "id": 1, "name": "Client",      "type": "client"   },
{ "id": 2, "name": "API Gateway", "type": "gateway"  },
{ "id": 3, "name": "Auth Service","type": "service"  }
```

### TypeScript caveat: JSON imports are widened

TypeScript infers the `type` field of a JSON import as `string`, not
`NodeType`. To keep the type system sound, cast the import when using it
as typed data:

```ts
import rawData from './graph-data.json'
import type { GraphData } from './types.ts'

const initialData = rawData as GraphData
```

---

## 2. Style factories — `styles.ts`

All style creation is extracted into a single module. This keeps styling
logic separate from component and hook code.

### Node styles — one factory per type

```ts
// src/styles.ts
import { ShapeNodeStyle } from '@yfiles/yfiles'
import type { NodeType } from './types.ts'

const NODE_STYLES: Record<NodeType, () => ShapeNodeStyle> = {
  client: () =>
    new ShapeNodeStyle({ shape: 'rectangle', fill: '#3d72c8', stroke: '1.5px #2855a0' }),
  gateway: () =>
    new ShapeNodeStyle({ shape: 'round-rectangle', fill: '#e08c00', stroke: '1.5px #b06c00' }),
  service: () =>
    new ShapeNodeStyle({ shape: 'round-rectangle', fill: '#0f9c99', stroke: '1.5px #0b7370' }),
  database: () =>
    new ShapeNodeStyle({ shape: 'hexagon', fill: '#6a3fb5', stroke: '1.5px #4d2d8a' }),
}

export function getNodeStyle(type: NodeType): ShapeNodeStyle {
  return NODE_STYLES[type]()
}
```

Each entry in `NODE_STYLES` is a **factory function** (a `() => …` arrow),
not a pre-built instance. `getNodeStyle()` calls the factory every time,
returning a _new_ `ShapeNodeStyle` object on each invocation.

**Why is this important?** yFiles treats style objects as potentially mutable.
If two nodes share the same style instance and you later modify one node's
appearance, both nodes change. Returning a fresh instance per node keeps
styles isolated.

### `ShapeNodeStyle` shapes

The `shape` property accepts a string literal. Common values include:

| Value               | Shape                          |
| ------------------- | ------------------------------ |
| `'rectangle'`       | Sharp-cornered rectangle       |
| `'round-rectangle'` | Rectangle with rounded corners |
| `'ellipse'`         | Oval / circle                  |
| `'hexagon'`         | Six-sided polygon              |
| `'diamond'`         | Rotated square                 |

### Edge style

```ts
export function createDefaultEdgeStyle(): PolylineEdgeStyle {
  return new PolylineEdgeStyle({
    stroke: '2px #888888',
    targetArrow: new Arrow({ type: 'triangle', fill: '#888888' }),
    smoothingLength: 20,
  })
}
```

`PolylineEdgeStyle` draws edges as straight or bent lines. The options:

- `stroke` — a CSS-like string: `'<width> <color>'`
- `targetArrow` — an `Arrow` instance placed at the edge's target end.
  `type: 'triangle'` renders a filled arrowhead; `fill` sets its color.
- `smoothingLength` — rounds the corners where edge segments bend.

### Label style

```ts
export function createDefaultLabelStyle(): LabelStyle {
  return new LabelStyle({ textFill: '#ffffff' })
}
```

`textFill` sets the text color — here white, to contrast with colored nodes.

---

## 3. Updating `GraphComponentProvider`

The provider gains two additions in this chapter:

```ts
// src/GraphComponentProvider.tsx
const inputMode = new GraphViewerInputMode()

// Clear the current item when the user clicks empty canvas.
// This fires 'current-item-changed', which useCurrentItem picks up,
// causing InfoPanel to hide.
inputMode.addEventListener('canvas-clicked', () => {
  gc.currentItem = null
})
gc.inputMode = inputMode

// Default styles for all edges and node labels.
gc.graph.edgeDefaults.style = createDefaultEdgeStyle()
gc.graph.nodeDefaults.labels.style = createDefaultLabelStyle()
```

`graph.edgeDefaults.style` is the style used for every new edge unless
overridden. `graph.nodeDefaults.labels.style` applies to every new label on
a node. Node body styles are **not** set as a default here because each node
needs a different style based on its `type` — that is handled by `styleProvider`
in the next step.

---

## 4. Data-driven node styles — `styleProvider`

In `useGraphBuilder.ts`, set a `styleProvider` on the node creator:

```ts
// src/useGraphBuilder.ts
nodesSource.nodeCreator.styleProvider = (item) => getNodeStyle(item.type)
```

`styleProvider` is a function called by `GraphBuilder`:

- **on creation** — when a new node is added to the graph
- **on update** — when `updateGraph()` is called and the item's data has changed

It receives the raw data item (`NodeData`) and returns a `ShapeNodeStyle`
instance. Because `getNodeStyle` returns a new instance each time, every
node gets its own style object — changes to one node's style never leak to
another.

---

## 5. Storing data on items — `tagProvider`

Before we can read data from a clicked item, the data must be _on_ the item.
The `tagProvider` stores the full source data object on each node and edge's
`tag` property:

```ts
// src/useGraphBuilder.ts
nodesSource.nodeCreator.tagProvider = (item) => item
edgesSource.edgeCreator.tagProvider = (item) => item
```

`tagProvider` is called once per item when the graph is built (and again on
`updateGraph()` if the item's data changed). Setting it to `(item) => item`
stores the entire data object, making every field accessible from `node.tag`
and `edge.tag` later.

---

## 6. `Toolbar` — context in action

`Toolbar` uses `useGraphComponent()` to call `executeCommand` — no prop
needed, no component hierarchy to thread through:

```tsx
// src/Toolbar.tsx
export function Toolbar() {
  const graphComponent = useGraphComponent()

  return (
    <div>
      <button onClick={() => graphComponent.executeCommand(Command.INCREASE_ZOOM)}>Zoom In</button>
      <button onClick={() => graphComponent.executeCommand(Command.DECREASE_ZOOM)}>Zoom Out</button>
      <button onClick={() => graphComponent.executeCommand(Command.ZOOM, 1)}>100%</button>
      <button onClick={() => void graphComponent.fitGraphBounds({ animated: true })}>Fit</button>
    </div>
  )
}
```

`Command.INCREASE_ZOOM` / `DECREASE_ZOOM` / `ZOOM` are built-in yFiles
commands executed by `graphComponent.executeCommand()`. `fitGraphBounds()`
pans and zooms the viewport to make all graph content visible.

---

## 7. Click feedback — `useCurrentItem` and `InfoPanel`

### `useCurrentItem` — bridging a yFiles event to React state

`GraphComponent.currentItem` holds the last item the user clicked. yFiles
fires a `'current-item-changed'` event whenever it changes. The hook converts
that event into a React state update:

```ts
// src/useCurrentItem.ts
export function useCurrentItem(graphComponent: GraphComponent): IModelItem | null {
  const [currentItem, setCurrentItem] = useState<IModelItem | null>(
    () => graphComponent.currentItem,
  )

  useEffect(() => {
    const listener = () => setCurrentItem(graphComponent.currentItem)
    graphComponent.addEventListener('current-item-changed', listener)
    return () => graphComponent.removeEventListener('current-item-changed', listener)
  }, [graphComponent])

  return currentItem
}
```

The pattern — `addEventListener` in a `useEffect`, `removeEventListener` in
the cleanup — is the standard way to bridge any imperative event system into
React state. The hook returns the current item as plain React state, so
components re-render automatically whenever the user clicks a new element.

### `InfoPanel` — reading the tag

`InfoPanel` receives the `IModelItem | null` and renders the overlay. It uses
`instanceof` checks (yFiles interfaces support `instanceof`) to distinguish
nodes from edges, then reads the tag:

```tsx
// src/InfoPanel.tsx
if (item instanceof INode) {
  const data = item.tag as NodeData // set by nodeCreator.tagProvider
  // → "You clicked on 'Client'"
}
if (item instanceof IEdge) {
  const sourceName = (item.sourceNode.tag as NodeData).name
  const targetName = (item.targetNode.tag as NodeData).name
  // → "Connection between 'Client' and 'API Gateway'"
}
```

The panel uses `position: absolute` and `pointerEvents: none` so it overlays
the canvas without blocking graph interactions.

### Updated `GraphView`

`GraphView` calls `useCurrentItem` and renders the overlay inside a
`position: relative` container:

```tsx
export function GraphView({ graphData }: Props) {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentItem = useCurrentItem(graphComponent)

  useAddGraphComponent(containerRef, graphComponent)
  useGraphBuilder(graphComponent, graphData)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <InfoPanel item={currentItem} />
    </div>
  )
}
```

The `position: relative` wrapper is essential — without it, `InfoPanel`'s
`position: absolute` would be relative to the nearest positioned ancestor
in the page, not the canvas area.

---

## 8. What changed vs chapter 3

| File                         | Change                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `types.ts`                   | Added `NodeType`, added `type` to `NodeData`                                       |
| `graph-data.json`            | Added `"type"` field to each node                                                  |
| `styles.ts`                  | **New file** — all style factory functions                                         |
| `GraphComponentProvider.tsx` | Adds `canvas-clicked` listener; sets edge + label defaults from `styles.ts`        |
| `useGraphBuilder.ts`         | Adds `tagProvider` on node and edge creators; adds `styleProvider` on node creator |
| `GraphView.tsx`              | Adds `useCurrentItem` and renders `InfoPanel` in a `position: relative` wrapper    |
| `InfoPanel.tsx`              | **New file** — click feedback overlay                                              |
| `useCurrentItem.ts`          | **New file** — bridges yFiles event to React state                                 |
| `Toolbar.tsx`                | **New file** — zoom controls using context                                         |
| `App.tsx`                    | Uses `Toolbar`; casts JSON import; adds `type` when creating dynamic nodes         |

---

## Key concepts

| Concept                                 | Summary                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ShapeNodeStyle`                        | Renders a node as a filled shape with a stroke border.                                                                |
| `PolylineEdgeStyle`                     | Renders an edge as a polyline with optional arrowheads.                                                               |
| `LabelStyle`                            | Controls text rendering for node and edge labels.                                                                     |
| `Arrow`                                 | An arrowhead placed at either end of an edge.                                                                         |
| `graph.edgeDefaults.style`              | Default style applied to all newly created edges.                                                                     |
| `graph.nodeDefaults.labels.style`       | Default style applied to all newly created node labels.                                                               |
| `nodeCreator.styleProvider`             | Per-item style factory called by `GraphBuilder` on create and update.                                                 |
| `nodeCreator.tagProvider`               | Stores the source data object on a node's `tag` for later retrieval.                                                  |
| `Command`                               | Built-in yFiles commands for zoom, fit, select-all, etc.                                                              |
| `fitGraphBounds()`                      | Animates the viewport to show all graph content.                                                                      |
| `graphComponent.currentItem`            | The item the user last clicked (`IModelItem \| null`).                                                                |
| `'current-item-changed'` event          | Fires when the user clicks a different graph element. Bridge to React state with `addEventListener` in a `useEffect`. |
| `'canvas-clicked'` event                | Fires on `GraphViewerInputMode` when the user clicks empty canvas. Use to clear `currentItem`.                        |
| `instanceof INode` / `instanceof IEdge` | yFiles interfaces support `instanceof` for runtime type narrowing.                                                    |

---

## Next chapter

[Chapter 5: Layout in a Web Worker →](../05-layout-worker/README.md)

Hierarchical layout works well for small graphs, but running it on the main
thread blocks the UI during computation. The next chapter moves layout
execution into a web worker so the app stays responsive with large datasets.
