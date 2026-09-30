import { Button } from '@i-thinking/design/components/button'
import { Checkbox } from '@i-thinking/design/components/checkbox'
import { Input } from '@i-thinking/design/components/input'
import { cn } from 'cn'

import { CONTROL_CLASS, Glyph } from './controls'
import type { DirectiveInput } from './types'

/**
 * 输入**声明**编辑器：写进指令里的 `inputs`（名字 / 说明 / 必填 / 默认值）。
 *
 * 与「运行参数」不是一回事：这里改的是指令本身、会落库；那边填的只是这一次运行传什么。
 * 过去两者挤在同一个「输入」区里，看着像在改指令，其实只是填表单 —— 正是「新增指令声明不了输入」
 * 这个毛病的来源。
 *
 * 声明里没有类型字段：corex 的输入本来就是个字符串值，类型由默认值推出来；
 * 编辑器再维护一份类型只会和 corex 打架。
 */

interface InputsEditorProps {
  inputs: DirectiveInput[]
  onChange: (next: DirectiveInput[]) => void
}

/** 默认值按文本编辑：清空 = 没声明默认值，不写一个空串冒充 */
function parseDefault(raw: string): string | undefined {
  return raw === '' ? undefined : raw
}

function InputsEditor(props: InputsEditorProps) {
  const inputs = props.inputs

  function patch(index: number, next: Partial<DirectiveInput>) {
    props.onChange(
      inputs.map(function (input, i) {
        return i === index ? { ...input, ...next } : input
      })
    )
  }

  function remove(index: number) {
    props.onChange(
      inputs.filter(function (_, i) {
        return i !== index
      })
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {inputs.length === 0 ? (
        <p className="text-xs text-muted-foreground">还没声明输入；运行时按下面的「运行参数」填值</p>
      ) : null}
      {inputs.map(function (input, index) {
        // 名字可以边改边空，按序号做 key 才不会把光标和内容搬错行
        return (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-md border border-dashed p-2">
            <div className="flex items-center gap-1.5">
              <Input
                className={CONTROL_CLASS}
                value={input.name}
                placeholder="名字，如 target"
                aria-label="输入名字"
                onChange={function (event) {
                  patch(index, { name: event.target.value })
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="删除输入"
                title="删除输入"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={function () {
                  remove(index)
                }}>
                <Glyph icon="mdi:trash-can-outline" />
              </Button>
            </div>
            <Input
              className={CONTROL_CLASS}
              value={input.description ?? ''}
              placeholder="说明（显示在运行表单里）"
              aria-label="输入说明"
              onChange={function (event) {
                patch(index, { description: event.target.value })
              }}
            />
            <div className="flex items-center gap-2">
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={Boolean(input.required)}
                  aria-label="必填"
                  onCheckedChange={function (checked) {
                    patch(index, { required: checked === true })
                  }}
                />
                必填
              </label>
              <Input
                className={cn(CONTROL_CLASS, 'min-w-0 flex-1')}
                value={input.default === undefined || input.default === null ? '' : String(input.default)}
                placeholder="默认值（留空 = 没默认值）"
                aria-label="默认值"
                onChange={function (event) {
                  patch(index, { default: parseDefault(event.target.value) })
                }}
              />
            </div>
          </div>
        )
      })}
      <Button
        type="button"
        variant="dashed"
        size="sm"
        className="w-fit"
        onClick={function () {
          props.onChange([...inputs, { name: '', description: '', required: false }])
        }}>
        <Glyph icon="mdi:plus" />
        添加输入
      </Button>
    </div>
  )
}

export default InputsEditor
