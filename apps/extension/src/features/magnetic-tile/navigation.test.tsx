import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavigationTile } from './navigation'

function buildTile(overrides: Partial<MagneticTile> = {}): MagneticTile {
  return {
    id: 'tile',
    index: 0,
    title: 'GitHub',
    url: 'https://github.com',
    round: '16px',
    mark: null,
    size: 2,
    shape: 'square',
    direction: 'horizontal',
    mirrorID: 'mirror',
    updatedAt: 0,
    createdAt: 0,
    textColor: '#ffffff',
    component: 'navigation',
    description: '',
    collectionID: null,
    downloadCount: 0,
    background: null,
    backdrop: null,
    archivedAt: null,
    ...overrides
  }
}

function renderTile(tile: MagneticTile) {
  return render(
    <NavigationTile
      tile={tile}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}

describe('NavigationTile', function () {
  it('没有图标时用标题首字占位', function () {
    renderTile(buildTile())

    expect(screen.getByText('G')).toBeTruthy()
    expect(screen.getByText('GitHub')).toBeTruthy()
  })

  it('点击在新标签页打开链接', function () {
    const open = vi.spyOn(window, 'open').mockImplementation(function () {
      return null
    })

    renderTile(buildTile())
    fireEvent.click(screen.getByText('GitHub'))

    expect(open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener')
    open.mockRestore()
  })

  it('没有链接时不打开窗口', function () {
    const open = vi.spyOn(window, 'open').mockImplementation(function () {
      return null
    })

    renderTile(buildTile({ url: null }))
    fireEvent.click(screen.getByText('GitHub'))

    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })
})
