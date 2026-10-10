/**
 * 对比部件：多维度表格呈现商品/方案对比与结论
 */
import { Badge } from '@i-thinking/design/components/badge'

import type { ComparePartData } from '@/features/agent/types'

interface CompareTableProps {
  data: ComparePartData
}

const HEAD_CLASS =
  'bg-muted text-muted-foreground border-border border-b px-3 py-1.5 text-start font-medium'
const CELL_CLASS = 'px-3 py-1.5'
const ROW_CLASS = 'border-border border-b last:border-b-0'

function CompareTable(props: CompareTableProps) {
  const { data } = props

  const hasPrice = data.items.some(function (item) {
    return Boolean(item.price)
  })

  const verdicts = data.items.filter(function (item) {
    return Boolean(item.verdict)
  })

  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border px-3 py-2">
      {data.title && <span className="text-sm font-medium">{data.title}</span>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={HEAD_CLASS}>维度</th>
              {data.items.map(function (item) {
                return (
                  <th
                    key={item.name}
                    className={HEAD_CLASS}>
                    {item.name}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {hasPrice ? (
              <tr className={ROW_CLASS}>
                <td className={`${CELL_CLASS} text-muted-foreground`}>价格</td>
                {data.items.map(function (item) {
                  return (
                    <td
                      key={item.name}
                      className={CELL_CLASS}>
                      {item.price ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ) : null}
            {data.attributes.map(function (attribute) {
              return (
                <tr
                  key={attribute}
                  className={ROW_CLASS}>
                  <td className={`${CELL_CLASS} text-muted-foreground`}>{attribute}</td>
                  {data.items.map(function (item) {
                    return (
                      <td
                        key={item.name}
                        className={CELL_CLASS}>
                        {item.values[attribute] ?? '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {verdicts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {verdicts.map(function (item) {
            return (
              <Badge
                key={item.name}
                variant="secondary">
                {item.name}：{item.verdict}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { CompareTable }
export type { CompareTableProps }
