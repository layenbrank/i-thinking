import { describe, expect, it } from 'vitest'

import {
  normalizeDefinition,
  parseDirectiveDocument,
  parseDirectives,
  parseImportResult
} from './directive'

describe('parseDirectives', function () {
  it('reads name / folder / source / updated_at_ms / bucket / summary', function () {
    const actual = parseDirectives([
      {
        name: 'build-intern',
        folder: '发布',
        source: 'D:\\x\\build-intern.yaml',
        updated_at_ms: 1_700_000_000_000,
        bucket: 'data',
        summary: { description: '打包', step_count: 3, input_count: 2, trigger_count: 1 }
      },
      {
        name: 'draft',
        folder: null,
        source: null,
        updated_at_ms: 0,
        bucket: null,
        summary: null
      }
    ])
    expect(actual).toEqual([
      {
        name: 'build-intern',
        folder: '发布',
        source: 'D:\\x\\build-intern.yaml',
        visible: true,
        updated_at_ms: 1_700_000_000_000,
        bucket: 'data',
        summary: { description: '打包', step_count: 3, input_count: 2, trigger_count: 1 }
      },
      {
        name: 'draft',
        folder: null,
        source: null,
        visible: true,
        updated_at_ms: 0,
        bucket: null,
        summary: null
      }
    ])
  })

  // 一条坏指令元信息可能只给了一半，缺的当 0 / 当「没有」而不是整条丢掉
  it('fills in the missing summary counts and empty optional text', function () {
    expect(parseDirectives([{ name: 'half', summary: { step_count: 2 } }])).toEqual([
      {
        name: 'half',
        folder: null,
        source: null,
        visible: true,
        updated_at_ms: 0,
        bucket: null,
        summary: { description: '', step_count: 2, input_count: 0, trigger_count: 0 }
      }
    ])
    const summaries = parseDirectives([{ name: 'bad', summary: 'nope' }]).map(function (entry) {
      return entry.summary
    })
    expect(summaries).toEqual([null])
  })

  // 空串在界面上会显示成一个空分组名，比不显示更让人困惑
  it('treats empty optional text as absent', function () {
    const actual = parseDirectives([{ name: 'x', folder: '', source: '' }])
    expect(actual[0].folder).toBeNull()
    expect(actual[0].source).toBeNull()
  })

  it('keeps a directive corex could not classify, but drops rows without a name', function () {
    const actual = parseDirectives([{ folder: 'x' }, null, 'nope', { name: 'ok' }])
    expect(actual).toEqual([
      { name: 'ok', folder: null, source: null, visible: true, updated_at_ms: 0, bucket: null, summary: null }
    ])
  })

  it('reads visible=false for hidden system directives', function () {
    const actual = parseDirectives([
      { name: 'capture-screenshot', visible: false, updated_at_ms: 1 }
    ])
    expect(actual[0].visible).toBe(false)
  })

  it('returns nothing for a shape it does not know', function () {
    expect(parseDirectives({ directives: ['a'] })).toEqual([])
  })
})

describe('parseDirectiveDocument', function () {
  it('keeps the yaml and the model corex sent', function () {
    const actual = parseDirectiveDocument({
      name: 'demo',
      folder: '发布',
      source: 'D:\\x\\demo.yaml',
      created_at_ms: 1,
      updated_at_ms: 2,
      yaml: 'name: demo\nsteps: []\n',
      definition: { name: 'demo', description: 'd', version: '1', inputs: [], steps: [] }
    })
    expect(actual).toEqual({
      name: 'demo',
      folder: '发布',
      source: 'D:\\x\\demo.yaml',
      created_at_ms: 1,
      updated_at_ms: 2,
      yaml: 'name: demo\nsteps: []\n',
      definition: { name: 'demo', description: 'd', version: '1', inputs: [], steps: [] }
    })
  })

  // corex 省略空字段，编辑器按「必有」渲染
  it('fills in what corex omits', function () {
    const actual = parseDirectiveDocument({ name: 'demo', definition: { name: 'demo' } })
    expect(actual.definition).toMatchObject({
      name: 'demo',
      description: '',
      version: '',
      inputs: [],
      steps: []
    })
    expect(actual).toMatchObject({ folder: null, source: null, yaml: '', updated_at_ms: 0 })
  })

  it('keeps the fields it does not know', function () {
    const actual = normalizeDefinition(
      { name: 'demo', steps: [{ id: 's1', action: 'fs.copy', future_option: true }] },
      'fallback'
    )
    expect(actual.steps[0]).toEqual({ id: 's1', action: 'fs.copy', future_option: true })
  })

  it('falls back to the document name and survives a broken payload', function () {
    expect(parseDirectiveDocument({ name: 'demo', definition: null }).definition.name).toBe('demo')
    expect(parseDirectiveDocument(null)).toMatchObject({ name: '', yaml: '' })
  })
})

describe('parseImportResult', function () {
  it('keeps every entry with a readable status', function () {
    const actual = parseImportResult({
      entries: [
        { name: 'a', path: 'D:\\y\\a.yaml', status: 'created' },
        { name: 'b', path: 'D:\\y\\b.yaml', status: 'failed', error: '语法错误' }
      ],
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 1
    })

    expect(actual.entries).toEqual([
      { name: 'a', path: 'D:\\y\\a.yaml', status: 'created', error: undefined },
      { name: 'b', path: 'D:\\y\\b.yaml', status: 'failed', error: '语法错误' }
    ])
    expect(actual).toMatchObject({ created: 1, updated: 0, skipped: 0, failed: 1 })
  })

  // 汇总数缺了就自己数：导入结果最要紧的就是「成没成、跳过了几个」
  it('counts the entries when corex leaves the totals out', function () {
    const actual = parseImportResult({
      entries: [
        { name: 'a', path: 'a.yaml', status: 'created' },
        { name: 'b', path: 'b.yaml', status: 'skipped' },
        { name: 'c', path: 'c.yaml', status: 'created' }
      ]
    })

    expect(actual).toMatchObject({ created: 2, updated: 0, skipped: 1, failed: 0 })
  })

  // 认不出的状态不当成四种里的任何一种，否则汇总数与列表会各说各话
  it('drops rows it cannot read and survives a broken payload', function () {
    expect(
      parseImportResult([{ name: 'a', status: 'created' }, { name: 'b', status: 'nope' }])
    ).toEqual({ entries: [], created: 0, updated: 0, skipped: 0, failed: 0 })
    expect(parseImportResult(null)).toEqual({
      entries: [],
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    })
  })
})

