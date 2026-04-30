import { Splitter } from 'antd'
import { clsx } from 'clsx'

import styles from '@/views/example/example.module.scss'
import './example.scss'

export default function Example() {
  const [sizes, updateSizes] = useState<(number | string)[]>(['15%', '85%'])

  return (
    <div className={clsx([styles.example, styles.root])}>
      <table>
        <caption>表格标题</caption>
        <colgroup>
          {Array.from({ length: 3 }).map((_, index) => (
            <col
              className={clsx({
                'col-header': index === 0,
                'col-data': index !== 0
              })}
              key={index}
              span={2}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">列标题</th>
            {Array.from({ length: 5 }).map((_, index) => (
              <th key={index}>内容-{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">行标题</th>
            {Array.from({ length: 5 }).map((_, index) => (
              <td key={index}>单元格数据-{index + 1}</td>
            ))}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6}>汇总信息</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
