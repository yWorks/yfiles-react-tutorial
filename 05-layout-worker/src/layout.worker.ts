import { HierarchicalLayout, LayoutExecutorAsyncWorker, License } from '@yfiles/yfiles'
import licenseData from './license.json'

// The yFiles license must be registered in the worker as well as in the
// main thread — web workers run in an isolated JavaScript context with no
// access to the main thread's globals.
License.value = licenseData

// LayoutExecutorAsyncWorker.initializeWebWorker() wires up the worker's
// message handler so it can receive serialized graph data from
// LayoutExecutorAsync on the main thread, run the layout algorithm, and
// send the results back.
LayoutExecutorAsyncWorker.initializeWebWorker((graph) => {
  const layout = new HierarchicalLayout()
  layout.applyLayout(graph)
})
