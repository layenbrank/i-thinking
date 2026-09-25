import { describe, expect, it } from 'vitest'

import { PROVIDER_KINDS } from './constants'
import {
  addModelIDs,
  collectModelOptions,
  filterModelOptions,
  findPresetModelIDs,
  isPresetModelID,
  toggleModelID
} from './models'

function findKind(value: string) {
  const kind = PROVIDER_KINDS.find(function (item) {
    return item.value === value
  })
  if (!kind) throw new Error(`缺少预设：${value}`)

  return kind
}

const DEEPSEEK = findKind('deepseek')

describe('findPresetModelIDs', function () {
  it('按厂商取预设清单；本地运行时（没有公开清单）与未知厂商都是空', function () {
    expect(findPresetModelIDs(DEEPSEEK.value)).toEqual(DEEPSEEK.models)
    expect(findPresetModelIDs('ollama')).toEqual([])
    expect(findPresetModelIDs('不存在的厂商')).toEqual([])
  })
})

describe('isPresetModelID', function () {
  it('认得出预设名，认不出用户手填的名字', function () {
    expect(isPresetModelID(DEEPSEEK.models[0])).toBe(true)
    expect(isPresetModelID('my-local-model')).toBe(false)
  })
})

describe('collectModelOptions', function () {
  it('预设在前，然后是已声明与当前值；重复的只留一个', function () {
    expect(
      collectModelOptions({
        kind: DEEPSEEK.value,
        declared: [DEEPSEEK.models[0], 'my-local-model'],
        current: 'my-local-model'
      })
    ).toEqual([...DEEPSEEK.models, 'my-local-model'])
  })

  it('当前值不在预设里时也要出现在候选中', function () {
    expect(collectModelOptions({ kind: 'ollama', declared: [], current: 'qwen3:8b' })).toEqual([
      'qwen3:8b'
    ])
  })

  it('没有声明也没有当前值时就是预设清单', function () {
    expect(collectModelOptions({ kind: DEEPSEEK.value, declared: [], current: '' })).toEqual([
      ...DEEPSEEK.models
    ])
  })
})

describe('filterModelOptions', function () {
  const options = ['deepseek-flash', 'deepseek-v4-pro', 'my-local-model']

  it('不区分大小写；空关键字不过滤', function () {
    expect(filterModelOptions(options, 'V4-PRO')).toEqual(['deepseek-v4-pro'])
    expect(filterModelOptions(options, '  ')).toEqual(options)
  })

  it('没有匹配时返回空数组', function () {
    expect(filterModelOptions(options, 'gpt')).toEqual([])
  })

  it('不修改原数组', function () {
    const source = [...options]
    filterModelOptions(source, '')
    expect(source).toEqual(options)
  })
})

describe('toggleModelID / addModelIDs', function () {
  it('勾一个排在后面，再勾一次摘掉，不产生重复', function () {
    expect(toggleModelID(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleModelID(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleModelID([], 'a')).toEqual(['a'])
  })

  it('批量追加会跳过已选的', function () {
    expect(addModelIDs(['a'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(addModelIDs([], [])).toEqual([])
  })
})
