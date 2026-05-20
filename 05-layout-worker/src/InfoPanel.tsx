import { IEdge, INode, type IModelItem } from '@yfiles/yfiles'
import type { NodeData } from './types.ts'

interface Props {
  item: IModelItem | null
}

/**
 * Overlay panel that shows the tag data of the currently focused graph item.
 *
 * Positioned absolutely in the top-left corner of the canvas.
 * `pointerEvents: none` ensures it never blocks clicks on the graph.
 */
export function InfoPanel({ item }: Props) {
  if (!item) return null

  let content: React.ReactNode

  if (item instanceof INode) {
    // item.tag was set by nodeCreator.tagProvider — it holds the NodeData object.
    const data = item.tag as NodeData
    content = (
      <>
        You clicked on <strong>&ldquo;{data.name}&rdquo;</strong>
      </>
    )
  } else if (item instanceof IEdge) {
    // Read node names from the source and target nodes' tags.
    const sourceName = (item.sourceNode.tag as NodeData).name
    const targetName = (item.targetNode.tag as NodeData).name
    content = (
      <>
        Connection between <strong>&ldquo;{sourceName}&rdquo;</strong> and{' '}
        <strong>&ldquo;{targetName}&rdquo;</strong>
      </>
    )
  } else {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 14,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {content}
    </div>
  )
}
