import { Arrow, LabelStyle, PolylineEdgeStyle, ShapeNodeStyle } from '@yfiles/yfiles'
import type { NodeType } from './types.ts'

// ---------------------------------------------------------------------------
// Node styles — one per node category
//
// Each call to getNodeStyle() returns a *new* ShapeNodeStyle instance so
// that nodes never share a style object.  This matters when the GraphBuilder
// or user interaction later mutates a node's style — changes stay isolated
// to that individual node.
// ---------------------------------------------------------------------------

const NODE_STYLES: Record<NodeType, () => ShapeNodeStyle> = {
  client: () =>
    new ShapeNodeStyle({
      shape: 'rectangle',
      fill: '#3d72c8',
      stroke: '1.5px #2855a0',
    }),
  gateway: () =>
    new ShapeNodeStyle({
      shape: 'round-rectangle',
      fill: '#e08c00',
      stroke: '1.5px #b06c00',
    }),
  service: () =>
    new ShapeNodeStyle({
      shape: 'round-rectangle',
      fill: '#0f9c99',
      stroke: '1.5px #0b7370',
    }),
  database: () =>
    new ShapeNodeStyle({
      shape: 'hexagon',
      fill: '#6a3fb5',
      stroke: '1.5px #4d2d8a',
    }),
}

export function getNodeStyle(type: NodeType): ShapeNodeStyle {
  return NODE_STYLES[type]()
}

// ---------------------------------------------------------------------------
// Edge style — applied as a graph-wide default
// ---------------------------------------------------------------------------

export function createDefaultEdgeStyle(): PolylineEdgeStyle {
  return new PolylineEdgeStyle({
    stroke: '2px #888888',
    // Arrow constructor: new Arrow({ type, fill })
    // 'triangle' renders a filled arrowhead at the target end.
    targetArrow: new Arrow({ type: 'triangle', fill: '#888888' }),
    smoothingLength: 20,
  })
}

// ---------------------------------------------------------------------------
// Label style — applied as a graph-wide default for node labels
// ---------------------------------------------------------------------------

export function createDefaultLabelStyle(): LabelStyle {
  return new LabelStyle({
    textFill: '#ffffff',
  })
}
