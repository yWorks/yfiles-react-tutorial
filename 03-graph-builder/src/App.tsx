import { useState } from 'react'
import { GraphComponentProvider } from './GraphComponentProvider.tsx'
import { GraphView } from './GraphView.tsx'
import type { GraphData } from './types.ts'
import initialData from './graph-data.json'

/**
 * App owns the data state and composes the UI.
 *
 * Note what App does NOT do: it never touches GraphComponent directly.
 * GraphView gets the GraphComponent from context — App only cares
 * about graphData.
 */
function App() {
  const [graphData, setGraphData] = useState<GraphData>(initialData)

  function addService() {
    const newId = Math.max(...graphData.nodesSource.map((n) => n.id)) + 1
    setGraphData({
      nodesSource: [...graphData.nodesSource, { id: newId, name: `Service ${newId}` }],
      // Connect the new service to the API Gateway (id 2) and the Database (id 6)
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
        <div
          style={{
            padding: '8px',
            display: 'flex',
            gap: '8px',
            background: '#f5f5f5',
            borderBottom: '1px solid #ddd',
          }}
        >
          <button onClick={addService}>Add Service</button>
          <button onClick={() => setGraphData(initialData)}>Reset</button>
        </div>
        {/* minHeight: 0 makes the flex item's height "definite" so that
            height: 100% on GraphView's children resolves correctly. */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <GraphView graphData={graphData} />
        </div>
      </div>
    </GraphComponentProvider>
  )
}

export default App
