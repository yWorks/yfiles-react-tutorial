# Chapter 5: Layout in a Web Worker

## What you'll build

The same styled microservices graph as chapter 4, but with the layout
algorithm running in a **dedicated web worker** instead of the main
thread. The graph behaviour is identical — what changes is where the
computation happens.

---

## Prerequisites

Completed [Chapter 4](../04-styles/README.md). This chapter is a small,
targeted modification to `useGraphBuilder.ts`. Everything else — styles,
Provider/Context architecture, `App.tsx`, `Toolbar.tsx`, `GraphView.tsx` —
stays the same.

---

## 1. Why move layout to a worker?

Layout algorithms walk every node and edge, solve geometric constraints, and
can take tens or hundreds of milliseconds on large graphs. Running this work
on the main thread blocks rendering and makes the UI feel sluggish.

Web workers run in a separate thread. Moving layout there gives two concrete
benefits:

1. **Main thread stays free** — React can re-render, animations can play, and
   the user can pan/zoom while the layout runs.
2. **Parallelism** — on multi-core hardware the layout genuinely executes
   concurrently with the UI thread.

yFiles provides a purpose-built pair of classes for this pattern:
`LayoutExecutorAsync` (main thread) and `LayoutExecutorAsyncWorker` (worker
thread). They handle serializing the graph, transferring it across the thread
boundary, running the algorithm, and animating the result — with no manual
`postMessage` wiring required.

---

## 2. The worker file — `layout.worker.ts`

The worker is a regular TypeScript module. It must:

1. Register the yFiles license (workers have their own isolated context).
2. Call `LayoutExecutorAsyncWorker.initializeWebWorker()` with a callback
   that creates and applies the layout algorithm.

```ts
// src/layout.worker.ts
import { HierarchicalLayout, LayoutExecutorAsyncWorker, License } from '@yfiles/yfiles'
import licenseData from './license.json'

License.value = licenseData

LayoutExecutorAsyncWorker.initializeWebWorker((graph) => {
  const layout = new HierarchicalLayout()
  layout.applyLayout(graph)
})
```

### `initializeWebWorker(callback)`

This static method sets up the worker's message listener. When the main
thread sends a layout request, the worker:

1. Deserializes the graph data into a `LayoutGraph`.
2. Passes that graph to your callback.
3. Your callback creates and runs the layout algorithm (`layout.applyLayout(graph)`).
4. The worker serializes the resulting positions and sends them back to
   the main thread.

The callback receives a `LayoutGraph` — a lightweight geometric graph used
only by layout algorithms. The optional second argument is a `LayoutDescriptor`
that can carry algorithm configuration from the main thread, but for a single
fixed algorithm it is simpler to hardcode the choice in the worker.

### The license in the worker

Workers run in a completely separate JavaScript realm — they share no globals,
no module cache, and no yFiles state with the main thread. This means
`License.value` must be set independently in the worker file. Importing the
same `license.json` is fine; Vite bundles it into the worker chunk.

---

## 3. Updating `useGraphBuilder.ts`

The changes from chapter 5 are confined to `useGraphBuilder.ts`:

1. Replace `LayoutExecutor` + `HierarchicalLayout` with `LayoutExecutorAsync`.
2. Create the worker once with `useMemo`.
3. Create the `LayoutExecutorAsync` **once** with `useMemo` and reuse it.

```ts
// src/useGraphBuilder.ts (chapter 6 changes shown)

// 1. Different import — no HierarchicalLayout needed on the main thread
import { GraphBuilder, GraphComponent, LayoutExecutorAsync } from '@yfiles/yfiles'

export function useGraphBuilder(graphComponent: GraphComponent, graphData: GraphData): void {
  const { builder, nodesSource, edgesSource } = useMemo(
    () => createGraphBuilder(graphComponent),
    [graphComponent],
  )

  // 2. Create the worker once
  const worker = useMemo(
    () => new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' }),
    [],
  )

  // 3. Create the executor once and reuse it
  //
  // IMPORTANT: createWebWorkerMessageHandler registers a message listener on
  // the Worker instance.  Creating a new LayoutExecutorAsync on every layout
  // call would register multiple competing listeners on the same worker —
  // responses would be routed to the wrong executor and layouts would hang.
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

  // No worker.terminate() cleanup — see "Worker cleanup and Strict Mode" below.

  useEffect(() => {
    builder.setData(nodesSource, graphData.nodesSource)
    builder.setData(edgesSource, graphData.edgesSource)
    builder.updateGraph()
    void executor.start() // reuse the stable executor — no new instance
  }, [builder, nodesSource, edgesSource, graphData, executor])
}
```

### `LayoutExecutorAsync.createWebWorkerMessageHandler(worker)`

This static method creates a message handler function that routes messages
between `LayoutExecutorAsync` and the `Worker` instance. It abstracts the
raw `postMessage` / `onmessage` wiring into a single call.

```
main thread                            worker thread
─────────────────────────────────────────────────────
LayoutExecutorAsync (reused)           LayoutExecutorAsyncWorker
  .start()                                .initializeWebWorker(callback)
     │                                          │
     │── serialized graph ──── postMessage ──►  │
     │                                          │ callback(graph)
     │                                          │ layout.applyLayout(graph)
     │◄── serialized result ── postMessage ──   │
     │                                          │
  animate transition
```

### Worker URL — `new URL('./layout.worker.ts', import.meta.url)`

The `new URL(…, import.meta.url)` pattern is Vite's (and the browser spec's)
way to reference a file for use as a worker. Vite detects this pattern and:

- Bundles `layout.worker.ts` as a **separate entry point**.
- Emits it as its own JavaScript file in the build output.
- Replaces the `new URL(…)` expression with the correct production URL.

The `{ type: 'module' }` option makes the worker a module worker, enabling
ES module syntax (`import`/`export`) inside the worker file.

### Why `useMemo([], [])` for the worker

The worker should be created exactly once — creating a new `Worker` on every
re-render would be expensive and would leave orphaned threads. `useMemo`
with an empty dependency array `[]` provides that guarantee: the factory
runs once when the hook is first called and the result is reused thereafter.

The same pattern was already used for the `GraphBuilder` instance.

### Worker cleanup and Strict Mode

You might expect a `useEffect` that calls `worker.terminate()` on unmount.
In production that would work — but React 18 Strict Mode deliberately
simulates unmount → remount in development.

The problem is identical to the `GraphComponent.cleanUp()` issue from
chapter 1: `useMemo` values survive the simulated unmount, but `useEffect`
cleanup runs during it. `terminate()` kills the worker thread, leaving
`useMemo` holding a dead `Worker` reference. Every subsequent
`executor.start()` posts messages to a terminated worker that never
responds — the layout hangs indefinitely.

The fix is the same: omit the cleanup. The worker thread is
garbage-collected when the page unloads.

---

## 4. What changed vs chapter 4

| File                 | Change                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `layout.worker.ts`   | **New file** — license + `LayoutExecutorAsyncWorker.initializeWebWorker()`                                           |
| `useGraphBuilder.ts` | Replaced `LayoutExecutor` + `HierarchicalLayout` with `LayoutExecutorAsync`; added `useMemo` for worker and executor |
| Everything else      | **Unchanged**                                                                                                        |

`HierarchicalLayout` is no longer imported on the main thread — it lives
entirely in the worker. The main thread creates the executor once and calls
`executor.start()` on each data change.

---

## Key concepts

| Concept                                 | Summary                                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayoutExecutorAsync`                   | Main-thread class that serializes the graph, sends it to the worker, waits for results, and animates the transition.                                                                        |
| `LayoutExecutorAsyncWorker`             | Worker-thread class that receives the serialized graph, calls your layout callback, and returns the result.                                                                                 |
| `initializeWebWorker(callback)`         | Sets up the worker's message listener. Your callback receives a `LayoutGraph` and applies the algorithm.                                                                                    |
| `createWebWorkerMessageHandler(worker)` | Creates the message handler connecting the main-thread executor to the worker instance. Call this once per worker — multiple calls register competing listeners.                            |
| `new URL(…, import.meta.url)`           | Vite-compatible way to reference a worker file; enables correct bundling and URL resolution.                                                                                                |
| `{ type: 'module' }`                    | Enables ES module syntax inside the worker. Required when using `import` statements.                                                                                                        |
| Worker cleanup                          | `Worker` threads are cleaned up when the page unloads. Do **not** call `terminate()` in a `useEffect` cleanup — Strict Mode will kill the worker while `useMemo` still holds the reference. |
