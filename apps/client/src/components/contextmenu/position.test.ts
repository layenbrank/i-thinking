import { describe, expect, it } from 'vitest'

import { parseItems, findFocusableItems } from '@/components/contextmenu/parse-items'
import { parsePopupOrigin, findViewportRect } from '@/components/contextmenu/position'

describe('parseItems', function () {
  it('assigns keys and nested types', function () {
    const parsed = parseItems([
      { label: 'A', key: 'a' },
      { type: 'divider' },
      {
        key: 'more',
        label: 'More',
        children: [{ key: 'b', label: 'B' }]
      }
    ])
    expect(parsed[0].type).toBe('item')
    expect(parsed[1].type).toBe('divider')
    expect(parsed[2].children?.[0].key).toBe('b')
  })

  it('finds focusable leaf and parent items', function () {
    const parsed = parseItems([
      { key: 'a', label: 'A' },
      { type: 'divider' },
      { key: 'b', label: 'B', disabled: true },
      { key: 'c', label: 'C', children: [{ key: 'c1', label: 'C1' }] }
    ])
    const focusable = findFocusableItems(parsed)
    expect(focusable.map(function (item) {
      return item.key
    })).toEqual(['a', 'c'])
  })
})

describe('parsePopupOrigin', function () {
  it('flips when overflowing right and bottom', function () {
    const container = {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200
    }
    const origin = parsePopupOrigin({
      anchor: { x: 180, y: 180 },
      panelSize: { width: 100, height: 80 },
      placement: 'pointer',
      offset: [0, 0],
      padding: 0,
      containerRect: container
    })
    expect(origin.flipX).toBe(true)
    expect(origin.flipY).toBe(true)
    expect(origin.left + 100).toBeLessThanOrEqual(200)
    expect(origin.top + 80).toBeLessThanOrEqual(200)
  })

  it('opens submenu to the left when right space is insufficient', function () {
    const container = findViewportRect(0)
    // force small container
    const box = {
      left: 0,
      top: 0,
      width: 300,
      height: 300,
      right: 300,
      bottom: 300
    }
    const origin = parsePopupOrigin({
      anchor: {
        left: 250,
        top: 40,
        width: 40,
        height: 32,
        right: 290,
        bottom: 72
      },
      panelSize: { width: 120, height: 100 },
      placement: 'submenu',
      offset: [0, 0],
      padding: 0,
      containerRect: box,
      preferRight: true
    })
    expect(origin.flipX).toBe(true)
    expect(origin.left).toBeGreaterThanOrEqual(0)
  })
})
