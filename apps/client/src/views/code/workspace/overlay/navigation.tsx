import { Icon } from '@iconify/react/offline'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import { documentDir, resolve } from '@tauri-apps/api/path'
import { readDir, readTextFile } from '@tauri-apps/plugin-fs'
import { cn } from 'cn'

const ROOT_KEY = 'ROOT'

interface TreeNode {
  title: string
  key: string
  isLeaf?: boolean
  children?: TreeNode[]
}

function updateTreeNodes(list: TreeNode[], key: string, children: TreeNode[]): TreeNode[] {
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

interface TreeItemProps {
  node: TreeNode
  onLoad: (node: TreeNode) => Promise<void>
  onSelect: (node: TreeNode) => void
}

function TreeItem(props: TreeItemProps) {
  const node = props.node

  if (node.isLeaf) {
    return (
      <li>
        <button
          type="button"
          onClick={function () {
            props.onSelect(node)
          }}
          className="w-full truncate rounded-sm px-1 py-0.5 text-left hover:bg-muted">
          {node.title}
        </button>
      </li>
    )
  }

  return (
    <li>
      <Collapsible
        className="group/node"
        onOpenChange={function (isOpen) {
          console.log('Trigger Expand', node.key, isOpen)
          if (isOpen) void props.onLoad(node)
        }}>
        <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left hover:bg-muted">
          <Icon
            icon="lucide:chevron-right"
            className="size-3.5 shrink-0 transition-transform group-data-[panel-open]/node:rotate-90"
          />
          <span className="truncate">{node.title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="pl-4">
            {node.children?.map(function (child) {
              return (
                <TreeItem
                  key={child.key}
                  node={child}
                  onLoad={props.onLoad}
                  onSelect={props.onSelect}
                />
              )
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

export default function Navigation() {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([
    {
      title: 'Documents',
      key: ROOT_KEY
    }
  ])

  function onSelect(node: TreeNode) {
    void (async function () {
      if (node.key === ROOT_KEY) return
      const documentPath = await documentDir()
      const repath = await resolve('.', documentPath, node.key)
      console.log('Selected path:', repath)
      const fragment = await readTextFile(repath)
      console.log('File content fragment:', fragment)
    })()
  }

  async function onLoad(node: TreeNode) {
    if (node.children) return

    const documentPath = await documentDir()
    const relativePath = node.key === ROOT_KEY ? '' : node.key
    const repath = await resolve('.', documentPath, relativePath)
    const entries = await readDir(repath)
    console.log('Directory entries for', repath, entries)

    const nextChildren: TreeNode[] = entries.map(function (entry) {
      const childKey = relativePath ? `${relativePath}/${entry.name}` : entry.name

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
    <ul className={cn('h-full w-full list-none overflow-x-hidden overflow-y-auto p-1 text-sm')}>
      {treeNodes.map(function (node) {
        return (
          <TreeItem
            key={node.key}
            node={node}
            onLoad={onLoad}
            onSelect={onSelect}
          />
        )
      })}
    </ul>
  )
}
