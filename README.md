# yFiles for HTML + React Tutorial

A step-by-step guide for React developers who want to build interactive
graph applications with [yFiles for HTML](https://www.yfiles.com/).

Each chapter is a self-contained Vite + React + TypeScript project. You can
run any chapter independently — just `npm install && npm run dev` inside its
directory.

---

## Prerequisites

- **React** — familiarity with components, hooks (`useState`, `useEffect`,
  `useRef`, `useMemo`), and context. No prior yFiles knowledge required.
- **Node.js** 18 or later
- A yFiles for HTML license (evaluation or commercial).

---

## Installing the yFiles Library

yFiles for HTML is distributed as a local npm package, a `.tgz` file. See the [Working with the yFiles npm Module](https://docs.yworks.com/yfileshtml/dguide/yfiles_npm_module/) Developer's Guide for in-depth information.

The subprojects that make up this tutorial are part of an npm workspace, so yFiles only has to be installed once in the toplevel folder:

```shell
# Enter the correct path to your yFiles tgz found in your extracted yFiles for HTML package 
npm install ./path/to/yfiles-<yFilesVersion>+dev.tgz
```

This will replace the placeholder entry for the yFiles dependency in the package.json with the correct path and make the yFiles library and TypeScript typings available in all subprojects.

---

## The yFiles license

yFiles requires a valid license at runtime. The tutorial steps expect the `license.json` to be available in the `src` folder.

Therefore, make sure to copy your yFiles for HTML data to a `license.json` file in the `src` folder of each tutorial step that you want to try out.

See also the Developer's Guide section on [Licensing](https://docs.yworks.com/yfileshtml/dguide/licensing/).

---

## Chapters

Each chapter builds directly on the previous one. The diff between consecutive chapters is intentionally small so each new concept stands out clearly.

### [1. Setup](./01-setup/README.md)

Mount a yFiles `GraphComponent` inside a React app using a
**Provider/Context architecture**. Learn how yFiles manages its own DOM
subtree and why the Provider pattern scales cleanly as the app grows.

**Introduces:** `GraphComponent`, `GraphComponentProvider`, `GraphComponentContext`,
`useGraphComponent`, `useAddGraphComponent`, `GraphViewerInputMode`,
`License`, `useMemo`, `useLayoutEffect`

---

### [2. First Graph](./02-first-graph/README.md)

Build a graph manually using the `IGraph` API — create nodes, add labels,
connect them with edges, and run a hierarchical layout.

**Introduces:** `IGraph`, `createNode`, `createEdge`, `LayoutExecutor`,
`HierarchicalLayout`

---

### [3. GraphBuilder](./03-graph-builder/README.md)

Load a graph from a JSON data file and keep it in sync with React state.
Add and remove nodes at runtime without touching the graph API directly.
Extracts the data-sync logic into a `useGraphBuilder` custom hook.

**Introduces:** `GraphBuilder`, `createNodesSource`, `createEdgesSource`,
`setData`, `updateGraph`, `useGraphBuilder`

---

### [4. Styles and Interaction](./04-styles-and-interaction/README.md)

Give nodes distinct shapes and colors based on their data type, apply
global edge and label styles, add a toolbar with zoom controls, and show
an overlay when the user clicks a node or edge.

**Introduces:** `ShapeNodeStyle`, `PolylineEdgeStyle`, `LabelStyle`, `Arrow`,
`nodeCreator.styleProvider`, `nodeCreator.tagProvider`, `edgeDefaults`,
`nodeDefaults`, `Command`, `fitGraphBounds`,
`currentItem`, `'current-item-changed'`, `'canvas-clicked'`

---

### [5. Layout in a Web Worker](./05-layout-worker/README.md)

Move layout computation off the main thread so the UI stays responsive
during recalculation. Covers the two-class yFiles worker pattern and Vite's
module worker syntax.

**Introduces:** `LayoutExecutorAsync`, `LayoutExecutorAsyncWorker`,
`initializeWebWorker`, `createWebWorkerMessageHandler`

---

## Running a chapter

```bash
cd chapters/01-setup   # or any other chapter
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

To type-check without running the dev server:

```bash
npx tsc -b --noEmit
```

---

## Next steps

This tutorial provides a concise yet comprehensive introduction to integrating yFiles for HTML into a React application.

As a next step, you can explore the [yFiles React demo](https://www.yfiles.com/demos/toolkit/react/), which showcases several interesting features, including:

- Image Export to SVG
- A Context menu
- Tooltips

Also check out the [React Component Node Style Demo](https://www.yfiles.com/demos/style/react-component-node-style/) for a more complex style that uses a React component and the [Material UI library](https://mui.com/material-ui/getting-started/) to visualize nodes.
