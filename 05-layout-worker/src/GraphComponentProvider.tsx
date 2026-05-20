import { type PropsWithChildren, useMemo } from 'react'
import {
  GraphComponent,
  GraphItemTypes,
  GraphViewerInputMode,
  Insets,
  License,
  Size,
} from '@yfiles/yfiles'
import licenseData from './license.json'
import { GraphComponentContext } from './GraphComponentContext.ts'
import { createDefaultEdgeStyle, createDefaultLabelStyle } from './styles.ts'

License.value = licenseData

export function GraphComponentProvider({ children }: PropsWithChildren) {
  const graphComponent = useMemo(() => {
    const gc = new GraphComponent()
    const inputMode = new GraphViewerInputMode({
      focusableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
      selectableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
    })
    inputMode.addEventListener('canvas-clicked', () => {
      gc.currentItem = null
    })
    gc.inputMode = inputMode
    gc.graph.nodeDefaults.size = new Size(140, 40)
    gc.contentMargins = new Insets(30)

    // Apply default styles for edges and node labels.
    // These are used by the GraphBuilder for all created elements unless
    // overridden by a styleProvider (which node styles are — see useGraphBuilder).
    gc.graph.edgeDefaults.style = createDefaultEdgeStyle()
    gc.graph.nodeDefaults.labels.style = createDefaultLabelStyle()

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
