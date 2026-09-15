import { describe, expect, it } from 'vitest'

import { parseActionIds } from './sidecar'

describe('parseActionIds', function () {
  it('extracts id from corex list_actions objects', function () {
    const actual = parseActionIds([
      { id: 'capture.screenshot', name: 'Screenshot', description: '…' },
      { id: 'file.write', name: 'Write', description: '…' }
    ])
    expect(actual).toEqual(['capture.screenshot', 'file.write'])
  })

  it('accepts string[]', function () {
    expect(parseActionIds(['a.b', 'c.d'])).toEqual(['a.b', 'c.d'])
  })

  it('accepts { actions } wrapper', function () {
    expect(
      parseActionIds({
        actions: [{ id: 'shell.run' }]
      })
    ).toEqual(['shell.run'])
  })

  it('skips invalid entries', function () {
    expect(parseActionIds([{ name: 'no-id' }, null, 1, { id: 'ok' }])).toEqual(['ok'])
  })
})

