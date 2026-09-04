import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ContextMenu } from '@/components/contextmenu'
import { Host, presentMenu, resetMenu } from '@/components/contextmenu/host'
import { findFocusable, hasChildren, parseMenuItems } from '@/components/contextmenu/menu'

describe('MenuItem.content', function () {
  it('treats content as submenu without children', function () {
    const parsed = parseMenuItems([
      {
        key: 'layout',
        label: '布局',
        content: <div>picker</div>
      }
    ])
    expect(hasChildren(parsed[0])).toBe(true)
    expect(parsed[0].content).toBeTruthy()
    expect(
      findFocusable(parsed).map(function (item) {
        return item.key
      })
    ).toEqual(['layout'])
  })
})

describe('Host reopen while visible', function () {
  afterEach(function () {
    resetMenu()
  })

  it('keeps menu mounted when presentMenu runs again', async function () {
    render(<Host />)

    act(function () {
      presentMenu({
        x: 12,
        y: 12,
        items: [{ key: 'a', label: 'Alpha' }]
      })
    })

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    act(function () {
      presentMenu({
        x: 48,
        y: 48,
        items: [{ key: 'b', label: 'Beta' }]
      })
    })

    expect(await screen.findByText('Beta')).toBeInTheDocument()

    // 旧层 exit 完成不得 resetMenu；新层应仍在
    await act(async function () {
      await new Promise(function (resolve) {
        setTimeout(resolve, 200)
      })
    })

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })
})

describe('Root reopen while visible', function () {
  it('keeps menu mounted and remounts for enter motion', async function () {
    render(
      <ContextMenu items={[{ key: 'a', label: 'Alpha' }]}>
        <button type="button">trigger</button>
      </ContextMenu>
    )

    const trigger = screen.getByRole('button', { name: 'trigger' })

    fireEvent.contextMenu(trigger, { clientX: 20, clientY: 20 })
    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.contextMenu(trigger, {
      clientX: 60,
      clientY: 60,
      bubbles: true
    })

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    await act(async function () {
      await new Promise(function (resolve) {
        setTimeout(resolve, 200)
      })
    })

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
