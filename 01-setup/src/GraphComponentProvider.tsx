import { type PropsWithChildren, useMemo } from 'react'
import { GraphComponent, GraphViewerInputMode, Insets, License, Size } from '@yfiles/yfiles'
import licenseData from './license.json'
import { GraphComponentContext } from './GraphComponentContext.ts'

// Load the yFiles license before using any yFiles API.
License.value = licenseData

/**
 * Creates a single GraphComponent for its subtree and exposes it via context.
 *
 * Responsibilities:
 *  - Creates the GraphComponent once (useMemo with [])
 *  - Configures interaction (GraphViewerInputMode: pan/zoom/select, no editing)
 *  - Sets node size and margin defaults shared by all consumers
 */
export function GraphComponentProvider({ children }: PropsWithChildren) {
  // useMemo with an empty dep array creates the GraphComponent exactly once
  // for the lifetime of this provider instance.  Any re-render of the parent
  // that keeps the provider mounted will reuse the same instance.
  const graphComponent = useMemo(() => {
    const gc = new GraphComponent()

    // GraphViewerInputMode enables panning, zooming, and item selection,
    // but prevents users from creating or editing graph elements.
    gc.inputMode = new GraphViewerInputMode()

    // Default node size used by IGraph.createNode() and GraphBuilder.
    gc.graph.nodeDefaults.size = new Size(140, 40)

    // Extra space around graph content when fitGraphBounds() is called.
    gc.contentMargins = new Insets(30)

    // The htmlElement is a plain <div> managed by yFiles.  Without explicit
    // dimensions it defaults to the browser's canvas default (~150px tall).
    // Setting 100%/100% makes it fill whatever container it is appended into.
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
