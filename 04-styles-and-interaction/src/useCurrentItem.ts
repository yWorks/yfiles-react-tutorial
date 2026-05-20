import { useState, useEffect } from 'react'
import { GraphComponent, type IModelItem } from '@yfiles/yfiles'

/**
 * Subscribes to the GraphComponent's current-item-changed event and returns
 * the current item as React state.
 *
 * yFiles fires current-item-changed whenever the user clicks a node or edge
 * (or clicks empty space, setting the item to null).  By mirroring that into
 * React state, any component calling this hook will re-render automatically
 * whenever the selection changes — without polling or manual wiring.
 */
export function useCurrentItem(graphComponent: GraphComponent): IModelItem | null {
  const [currentItem, setCurrentItem] = useState<IModelItem | null>(
    () => graphComponent.currentItem,
  )

  useEffect(() => {
    const listener = () => setCurrentItem(graphComponent.currentItem)
    graphComponent.addEventListener('current-item-changed', listener)
    return () => graphComponent.removeEventListener('current-item-changed', listener)
  }, [graphComponent])

  return currentItem
}
