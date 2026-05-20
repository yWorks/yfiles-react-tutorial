import { Command } from '@yfiles/yfiles'
import { useGraphComponent } from './GraphComponentContext.ts'

/**
 * Zoom and fit controls for the graph.
 */
export function Toolbar() {
  const graphComponent = useGraphComponent()

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button onClick={() => graphComponent.executeCommand(Command.INCREASE_ZOOM)}>Zoom In</button>
      <button onClick={() => graphComponent.executeCommand(Command.DECREASE_ZOOM)}>Zoom Out</button>
      <button onClick={() => graphComponent.executeCommand(Command.ZOOM, 1)}>100%</button>
      <button onClick={() => void graphComponent.fitGraphBounds({ animated: true })}>Fit</button>
    </div>
  )
}
