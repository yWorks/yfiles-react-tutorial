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
