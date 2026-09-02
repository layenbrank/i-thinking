/**
 * session/request_permission（仅 ACP SDK 1.3）
 */
import type {
  PermissionOption,
  RequestPermissionRequest,
  RequestPermissionResponse
} from '@agentclientprotocol/sdk'
import { Button, Modal, Space } from 'antd'
import { createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'

const ALLOW_KINDS = new Set(['allow_once', 'allow_always'])

function isAllowOption(option: PermissionOption): boolean {
  return ALLOW_KINDS.has(option.kind)
}

function formatToolDetail(params: RequestPermissionRequest): string {
  const title = params.toolCall.title?.trim()
  const input = params.toolCall.rawInput
  const lines: string[] = []
  if (title) lines.push(title)
  if (input !== undefined) {
    try {
      lines.push(JSON.stringify(input, null, 2))
    } catch {
      lines.push(String(input))
    }
  }
  if (lines.length === 0) return '代理请求执行一项可能敏感的操作'
  return lines.join('\n\n')
}

function selectedResponse(optionId: string): RequestPermissionResponse {
  return {
    outcome: {
      outcome: 'selected',
      optionId
    }
  }
}

function cancelledResponse(): RequestPermissionResponse {
  return {
    outcome: {
      outcome: 'cancelled'
    }
  }
}

interface PermissionDialogProps {
  params: RequestPermissionRequest
  onResolve(response: RequestPermissionResponse): void
}

function PermissionDialog(props: PermissionDialogProps) {
  const [open, setOpen] = useState(true)
  const options = props.params.options ?? []
  const heading = props.params.toolCall.title?.trim() || 'Goose 请求权限'
  const detail = formatToolDetail(props.params)

  function finish(response: RequestPermissionResponse) {
    setOpen(false)
    props.onResolve(response)
  }

  return createElement(
    Modal,
    {
      open,
      title: heading,
      centered: true,
      closable: true,
      maskClosable: false,
      footer: null,
      onCancel() {
        finish(cancelledResponse())
      }
    },
    createElement(
      'pre',
      {
        style: {
          margin: '0 0 16px',
          maxHeight: 240,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }
      },
      detail
    ),
    createElement(
      Space,
      { wrap: true, style: { width: '100%', justifyContent: 'flex-end' } },
      ...options.map(function (option) {
        return createElement(
          Button,
          {
            key: option.optionId,
            type: isAllowOption(option) ? 'primary' : 'default',
            onClick() {
              finish(selectedResponse(option.optionId))
            }
          },
          option.name || option.kind
        )
      }),
      options.length === 0
        ? createElement(
            Button,
            {
              onClick() {
                finish(cancelledResponse())
              }
            },
            '取消'
          )
        : null
    )
  )
}

async function requestAcpPermission(
  params: RequestPermissionRequest
): Promise<RequestPermissionResponse> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)

  return new Promise(function (resolve) {
    function dispose(response: RequestPermissionResponse) {
      resolve(response)
      queueMicrotask(function () {
        root.unmount()
        host.remove()
      })
    }

    root.render(
      createElement(PermissionDialog, {
        params,
        onResolve: dispose
      })
    )
  })
}

export { requestAcpPermission }
