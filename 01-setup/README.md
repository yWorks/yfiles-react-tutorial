# Chapter 1: Setting Up a React Project with yFiles

## What you'll build

A minimal React application that renders an empty yFiles graph canvas using a
**Provider/Context architecture** that all subsequent chapters build on. No data yet — but the canvas will be fully interactive: you can pan by dragging
and zoom with the scroll wheel. That comes "for free" with yFiles.

---

## Prerequisites

- Node.js 18+ and npm
- A yFiles for HTML license (a `.tgz` package file and a `license.json` file).
  If you are evaluating yFiles, download the evaluation package from the
  [yWorks Customer Center](https://my.yworks.com/).

---

## 1. Scaffold the project

Create a new Vite project with the React TypeScript template:

```bash
npm create vite@latest my-yfiles-app -- --template react-ts
cd my-yfiles-app
```

The generated project gives you a standard React + TypeScript setup. Delete the
boilerplate content from `src/App.tsx` — we will replace it entirely.

---

## 2. Install yFiles

yFiles for HTML is distributed as a local npm package, a `.tgz` file. See the [Working with the yFiles npm Module](https://docs.yworks.com/yfileshtml/dguide/yfiles_npm_module/) Developer's Guide section for in-depth information.

If the yFiles dependency has not been set up yet using the toplevel npm workspace, install it:

```shell
# Enter the correct path to your yFiles tgz found in your extracted yFiles for HTML package
npm install ./path/to/yfiles-<yFilesVersion>+dev.tgz
```

Here, we use the development version of the library. Again, the Developer's Guide provides more in-depth information in the [Development Mode](https://docs.yworks.com/yfileshtml/dguide/yfiles_development_mode/) chapter.

After installation, the yFiles TypeScript types are available in `node_modules`
and autocompletion works in your IDE just like any other npm package.

---

## 3. The yFiles license

yFiles requires a valid license at runtime. Without one, the library will throw
an error before rendering anything.

The tutorial apps expect the `license.json` in the `src` folder.

The license is loaded by assigning it to `License.value` **before** any other
yFiles API is called:

```ts
import { License } from '@yfiles/yfiles'
import licenseData from './license.json'

License.value = licenseData
```

See also the Developer's Guide section on [Licensing](https://docs.yworks.com/yfileshtml/dguide/licensing/).

---

## 4. The [`GraphComponent`](https://docs.yworks.com/yfileshtml/api/GraphComponent/)

`GraphComponent` is the central UI element in yFiles. It is **not** a React
component. yFiles uses its own rendering engine rather than React's virtual DOM.

This means you need to bridge the two worlds: let React manage a container
`<div>`, and let yFiles own a child element inside it.

Rather than creating the `GraphComponent` inside a single component, we use
the **Provider/Context pattern** so any component in the tree can access it.
This architecture scales naturally as the app grows and is the pattern all
subsequent chapters build on.

---

## 5. `GraphComponentContext` — creating the context

Create `src/GraphComponentContext.ts`:

```ts
import { createContext, useContext, useLayoutEffect, type RefObject } from 'react'
import { GraphComponent } from '@yfiles/yfiles'

export const GraphComponentContext = createContext<GraphComponent | null>(null)

export function useGraphComponent(): GraphComponent {
  const gc = useContext(GraphComponentContext)
  if (!gc) {
    throw new Error('useGraphComponent must be called inside a <GraphComponentProvider>.')
  }
  return gc
}

export function useAddGraphComponent(
  containerRef: RefObject<HTMLDivElement | null>,
  graphComponent: GraphComponent,
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.appendChild(graphComponent.htmlElement)

    return () => {
      container.removeChild(graphComponent.htmlElement)
    }
  }, [containerRef, graphComponent])
}
```

This file exports three things:

- **`GraphComponentContext`** — the React context that holds the
  `GraphComponent` instance.
- **`useGraphComponent()`** — a custom hook that reads the context and
  throws if called outside a provider. This turns a silent null-dereference
  into a clear, immediate error.
- **`useAddGraphComponent()`** — a hook that appends `graphComponent.htmlElement`
  to a container `<div>`.

### Why `useLayoutEffect` instead of `useEffect`?

`useEffect` fires _after_ the browser paints. If you use it to append the
canvas element, users see a flash of empty space on the first frame.
`useLayoutEffect` fires synchronously _before_ the browser paints, so the
canvas is visible from the very first frame.

---

## 6. `GraphComponentProvider` — `useMemo` for stable instances

The provider creates the `GraphComponent` **once** using `useMemo`:

```tsx
// src/GraphComponentProvider.tsx
import { type PropsWithChildren, useMemo } from 'react'
import { GraphComponent, GraphViewerInputMode, Insets, License, Size } from '@yfiles/yfiles'
import licenseData from './license.json'
import { GraphComponentContext } from './GraphComponentContext.ts'

License.value = licenseData

export function GraphComponentProvider({ children }: PropsWithChildren) {
  const graphComponent = useMemo(() => {
    const gc = new GraphComponent()

    // GraphViewerInputMode enables panning, zooming, and item selection,
    // but prevents users from creating or editing graph elements.
    gc.inputMode = new GraphViewerInputMode()

    gc.graph.nodeDefaults.size = new Size(140, 40)
    gc.contentMargins = new Insets(30)
    gc.htmlElement.style.width = '100%'
    gc.htmlElement.style.height = '100%'

    return gc
  }, [])

  return (
    <GraphComponentContext.Provider value={graphComponent}>
      {children}
    </GraphComponentContext.Provider>
  )
}
```

### `useMemo` vs `useEffect` for creation

|              | `useEffect`                                 | `useMemo`                    |
| ------------ | ------------------------------------------- | ---------------------------- |
| When it runs | After paint, asynchronously                 | During render, synchronously |
| Good for     | Side effects (DOM mutations, subscriptions) | Creating stable values       |

`new GraphComponent()` just allocates memory — it does not need DOM access.
`useMemo` is therefore the right choice: it produces a value, not a side effect.

### Why no `cleanUp()` call?

React 18 Strict Mode deliberately mounts → unmounts → remounts every component
in development. If `cleanUp()` ran during the simulated unmount, the
`GraphComponent`'s rendering engine would be irreversibly disposed, and the
remount would render nothing. Omitting the cleanup lets the provider remount
cleanly; the GC is garbage-collected when the app unloads anyway.

### `GraphViewerInputMode`

Setting `gc.inputMode = new GraphViewerInputMode()` enables panning, zooming,
and item selection while **preventing users from creating or editing graph
elements**. Always use a viewer input mode when displaying read-only data;
without it, the default `GraphEditorInputMode` lets users drag nodes and draw
edges.

---

## 7. `GraphView` — mounting the canvas

```tsx
// src/GraphView.tsx
import { useRef } from 'react'
import { useAddGraphComponent, useGraphComponent } from './GraphComponentContext.ts'

export function GraphView() {
  const graphComponent = useGraphComponent()
  const containerRef = useRef<HTMLDivElement>(null)

  useAddGraphComponent(containerRef, graphComponent)

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

`GraphView` has one job: mount the canvas. It reads the `GraphComponent` from
context (via `useGraphComponent`) and attaches it to a container `<div>` (via
`useAddGraphComponent`). It has no knowledge of how the `GraphComponent` was
created.

---

## 8. Wire it up in `App.tsx`

```tsx
import { GraphComponentProvider } from './GraphComponentProvider.tsx'
import { GraphView } from './GraphView.tsx'

function App() {
  return (
    <GraphComponentProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <GraphView />
      </div>
    </GraphComponentProvider>
  )
}

export default App
```

`GraphComponentProvider` wraps the tree and creates the `GraphComponent`.
`GraphView` mounts the canvas. `App` composes them — it never touches
`GraphComponent` directly.

The outer `<div>` must have an explicit size — `100vw × 100vh` fills the
viewport. yFiles uses the size of its container to determine how much canvas
to render.

---

## 9. Run it

```bash
npm run dev
```

Open `http://localhost:5173`. You should see a blank white canvas. Try panning
(click and drag) and zooming (scroll wheel) — yFiles enables both by default.

---

## Key concepts

| Concept                  | Summary                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `License.value`          | Must be set before any yFiles API call.                                                       |
| `GraphComponent`         | The yFiles GraphComponent is the main view component that visualizes a graph instance.        |
| `GraphComponentContext`  | React context that holds the single `GraphComponent` instance.                                |
| `useGraphComponent()`    | Custom hook that reads the context; throws outside a provider.                                |
| `useMemo(factory, [])`   | Creates a stable value once per provider mount. Right tool for creating the `GraphComponent`. |
| `useAddGraphComponent()` | Attaches `htmlElement` to a container div via `useLayoutEffect`.                              |
| `useLayoutEffect`        | Fires after DOM update but before paint. Use for DOM mutations.                               |
| `GraphViewerInputMode`   | Read-only interaction: pan, zoom, select. No graph editing.                                   |

---

## Next chapter

[Chapter 2: Displaying a Graph →](../02-first-graph/README.md)

In the next chapter we'll use the `IGraph` API to create nodes and edges
programmatically inside a `GraphView`, and apply a layout algorithm to
arrange them automatically.
