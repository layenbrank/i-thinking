import { cn } from 'cn'

const CELL =
  'border-border border-r border-b px-2.5 py-1.5 text-left whitespace-nowrap last:border-r-0'
const HEAD = cn(CELL, 'bg-card sticky top-0 align-bottom')

export default function Example() {
  return (
    <div className="size-full">
      <table className="block h-60 w-full overflow-x-auto">
        <caption>表格标题</caption>
        <colgroup>
          {Array.from({ length: 3 }).map(function (_, index) {
            return (
              <col
                key={index}
                span={2}
                className={cn(index === 0 ? 'w-30' : 'bg-primary/10 text-center')}
              />
            )
          })}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className={HEAD}>
              列标题
            </th>
            {Array.from({ length: 5 }).map(function (_, index) {
              return (
                <th
                  key={index}
                  className={HEAD}>
                  内容-{index + 1}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="whitespace-nowrap">
          <tr>
            <th
              scope="row"
              className={CELL}>
              行标题
            </th>
            {Array.from({ length: 5 }).map(function (_, index) {
              return (
                <td
                  key={index}
                  className={CELL}>
                  单元格数据-{index + 1}
                </td>
              )
            })}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={6}
              className={CELL}>
              汇总信息
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
