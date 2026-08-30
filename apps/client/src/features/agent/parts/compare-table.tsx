/**
 * 对比部件：多维度表格呈现商品/方案对比与结论
 */
import { Flex, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'

import type { ComparePartData } from '@/features/agent/types'

interface CompareTableProps {
  data: ComparePartData
}

function CompareTable(props: CompareTableProps) {
  const { data } = props

  const columns = useMemo(
    function () {
      type Column = { title: string; dataIndex: string; key: string; width?: number }
      const base: Column[] = [
        { title: '维度', dataIndex: 'attribute', key: 'attribute', width: 110 }
      ]
      const itemColumns: Column[] = data.items.map(function (item) {
        return { title: item.name, dataIndex: item.name, key: item.name }
      })
      return base.concat(itemColumns)
    },
    [data.items]
  )

  const rows = useMemo(
    function () {
      const result: Record<string, string>[] = []
      const hasPrice = data.items.some(function (item) {
        return Boolean(item.price)
      })
      if (hasPrice) {
        const row: Record<string, string> = { key: '__price', attribute: '价格' }
        data.items.forEach(function (item) {
          row[item.name] = item.price ?? '—'
        })
        result.push(row)
      }
      data.attributes.forEach(function (attribute) {
        const row: Record<string, string> = { key: attribute, attribute }
        data.items.forEach(function (item) {
          row[item.name] = item.values[attribute] ?? '—'
        })
        result.push(row)
      })
      return result
    },
    [data.attributes, data.items]
  )

  const verdicts = data.items.filter(function (item) {
    return Boolean(item.verdict)
  })

  return (
    <Flex
      vertical
      gap={8}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--ith-color-border)',
        borderRadius: 'var(--ith-border-radius)',
        background: 'var(--ith-color-bg-container)'
      }}>
      {data.title && <Typography.Text strong>{data.title}</Typography.Text>}
      <Table
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
      />
      {verdicts.length > 0 && (
        <Flex
          gap={6}
          wrap>
          {verdicts.map(function (item) {
            return (
              <Tag
                key={item.name}
                color="blue">
                {item.name}：{item.verdict}
              </Tag>
            )
          })}
        </Flex>
      )}
    </Flex>
  )
}

export { CompareTable }
export type { CompareTableProps }
