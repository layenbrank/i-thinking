import { documentDir, resolve } from '@tauri-apps/api/path'
import { readDir, readTextFile } from '@tauri-apps/plugin-fs'
import { clsx } from 'clsx'
import { useState, type Key } from 'react'

import { DownOutlined } from '@ant-design/icons'
import type { GetProps, TreeDataNode } from 'antd'
import { Tree } from 'antd'

import styles from '@/features/magnetic-tiles/markdown/workspace/overlay/navigation.module.scss'

type TreeProps = GetProps<typeof Tree.DirectoryTree>

const { DirectoryTree } = Tree

interface NavigationProps {
  onUpdateFragment?: (fragment: string) => void
}

export default function Navigation(props: NavigationProps) {
  const rootKey = 'ROOT'
  const [treeNodes, setTreeNodes] = useState<TreeDataNode[]>([
    {
      title: 'Documents',
      key: rootKey
    }
  ])

  const updateTreeNodes = function (
    list: TreeDataNode[],
    key: Key,
    children: TreeDataNode[]
  ): TreeDataNode[] {
    return list.map(function (node) {
      if (node.key === key) {
        return {
          ...node,
          children
        }
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeNodes(node.children, key, children)
        }
      }
      return node
    })
  }

  const onSelect: TreeProps['onSelect'] = function (keys, info) {
    void (async function () {
      console.log('Trigger Select', keys, info)
      const [key] = keys
      if (!info.node.isLeaf) return
      if (typeof key !== 'string') return
      if (key === rootKey) return
      const documentPath = await documentDir()
      const repath = await resolve('.', documentPath, key)
      console.log('Selected path:', repath)
      const fragment = await readTextFile(repath)
      // const fragment = await readFile(repath)
      // console.log('File content fragment:', fragment)
      // // buffer to string
      // const decoder = new TextDecoder('utf-8')
      // const content = decoder.decode(fragment)
      // console.log('File content:', content)
      props.onUpdateFragment?.(fragment)
    })()
  }

  const onExpand: TreeProps['onExpand'] = function (keys, info) {
    console.log('Trigger Expand', keys, info)
  }

  const onLoadData: TreeProps['loadData'] = async function (node) {
    const treeNode = node as TreeDataNode
    if (treeNode.children) return

    const documentPath = await documentDir()
    const relativePath = node.key === rootKey ? '' : String(node.key)
    const repath = await resolve('.', documentPath, relativePath)
    const entries = await readDir(repath)
    console.log('Directory entries for', repath, entries)

    const nextChildren: TreeDataNode[] = entries.map(function (entry) {
      const childKey = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name

      return {
        title: entry.name,
        key: childKey,
        isLeaf: !entry.isDirectory
      }
    })

    setTreeNodes(function (origin) {
      return updateTreeNodes(origin, node.key, nextChildren)
    })
  }

  return (
    <DirectoryTree
      multiple
      showLine
      onSelect={onSelect}
      onExpand={onExpand}
      loadData={onLoadData}
      treeData={treeNodes}
      switcherIcon={<DownOutlined />}
      className={clsx([styles.navigation, styles.root])}
    />
  )

  // return (
  //   <div>
  //     <ul className={clsx(['flex flex-col gap-y-2'])}>
  //       {dirs.map(function (dir) {
  //         return (
  //           <li
  //             key={dir.name}
  //             className={clsx(['px-5 py-2 bg-red-300'])}>
  //             {dir.name}
  //           </li>
  //         )
  //       })}
  //     </ul>
  //   </div>
  // )
}
