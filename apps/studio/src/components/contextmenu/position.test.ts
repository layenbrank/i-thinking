import { describe, expect, it } from 'vitest'

import { parseMenuItems, findFocusable } from '@/components/contextmenu/menu'
import { parseOrigin, findViewportRect } from '@/components/contextmenu/position'

describe('parseMenuItems', function () {
  it('assigns keys and nested types', function () {
    const parsed = parseMenuItems([
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
    const parsed = parseMenuItems([
      { key: 'a', label: 'A' },
      { type: 'divider' },
      { key: 'b', label: 'B', disabled: true },
      { key: 'c', label: 'C', children: [{ key: 'c1', label: 'C1' }] }
    ])
    const focusable = findFocusable(parsed)
    expect(
      focusable.map(function (item) {
        return item.key
      })
    ).toEqual(['a', 'c'])
  })
})

describe('parseOrigin', function () {
  it('flips when overflowing right and bottom', function () {
    const container = {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200
    }
    const origin = parseOrigin({
      anchor: { x: 180, y: 180 },
      size: { width: 100, height: 80 },
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
    void findViewportRect(0)
    const box = {
      left: 0,
      top: 0,
      width: 300,
      height: 300,
      right: 300,
      bottom: 300
    }
    const origin = parseOrigin({
      anchor: {
        left: 250,
        top: 40,
        width: 40,
        height: 32,
        right: 290,
        bottom: 72
      },
      size: { width: 120, height: 100 },
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
