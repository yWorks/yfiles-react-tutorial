import { useState } from 'react'
import { GraphComponentProvider } from './GraphComponentProvider.tsx'
import { GraphView } from './GraphView.tsx'
import { Toolbar } from './Toolbar.tsx'
import type { GraphData } from './types.ts'
import rawData from './graph-data.json'

const initialData = rawData as GraphData

/**
 * App owns the data state and composes the UI.
 *
 * Note what App does NOT do: it never touches GraphComponent directly.
 * Toolbar and GraphView each get the GraphComponent from context — App
 * only cares about graphData.
 */
function App() {
  const [graphData, setGraphData] = useState<GraphData>(initialData)

  function addService() {
    const newId = Math.max(...graphData.nodesSource.map((n) => n.id)) + 1
    setGraphData({
      nodesSource: [
        ...graphData.nodesSource,
        { id: newId, name: `Service ${newId}`, type: 'service' },
      ],
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
        {/* Toolbar reads GraphComponent from context for zoom commands,
            and receives data controls as plain props/closures from App. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            background: '#f5f5f5',
            borderBottom: '1px solid #ddd',
          }}
        >
          <Toolbar />
          <span style={{ width: '1px', background: '#ccc', alignSelf: 'stretch' }} />
          <button onClick={addService}>Add Service</button>
          <button onClick={() => setGraphData(initialData)}>Reset</button>
        </div>

        {/* GraphView reads GraphComponent from context to mount the canvas,
            and receives graphData as a regular prop from App. */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <GraphView graphData={graphData} />
        </div>
      </div>
    </GraphComponentProvider>
  )
}

export default App
