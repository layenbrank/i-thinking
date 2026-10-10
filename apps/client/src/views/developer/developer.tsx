import { Icon } from '@iconify/react/offline'
import { Avatar, AvatarImage } from '@i-thinking/design/components/avatar'
import { Button } from '@i-thinking/design/components/button'
import { Card } from '@i-thinking/design/components/card'
import { Dialog, DialogContent } from '@i-thinking/design/components/dialog'
import { ToggleGroup, ToggleGroupItem } from '@i-thinking/design/components/toggle-group'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'

type SegmentedGenre = 'collection' | 'mirror'

interface SegmentedOption {
  value: SegmentedGenre
  label: string
  icon: string
}

interface OSGenre {
  OS: string
  version: string
  kernel: string
  hostname: string
  CPU: {
    brand: string
    frequency: number
    cores: number
    arch: string
  }
  memory: {
    total: number
    used: number
  }
  swap: {
    total: number
    used: number
  }
}

const PANEL_ACTIONS = [
  { key: 'star', icon: 'lucide:star', text: '156' },
  { key: 'like', icon: 'lucide:thumbs-up', text: '156' },
  { key: 'message', icon: 'lucide:message-circle', text: '2' }
]

export default function Developer() {
  const [OS, updateOS] = useState<OSGenre>({
    OS: 'unknown',
    version: 'unknown',
    kernel: 'unknown',
    hostname: 'unknown',
    CPU: {
      brand: 'unknown',
      frequency: 0,
      cores: 0,
      arch: 'unknown'
    },
    memory: {
      total: 0,
      used: 0
    },
    swap: {
      total: 0,
      used: 0
    }
  })
  const [drawerVisible, updateDrawerVisible] = useState<boolean>(false)
  const [segmented, updateSegmented] = useState<SegmentedGenre>('collection')

  const segmentedOptions: SegmentedOption[] = [
    {
      value: 'collection',
      label: '合集',
      icon: 'lucide:list'
    },
    {
      value: 'mirror',
      label: '镜像',
      icon: 'lucide:layout-grid'
    }
  ]

  const panelOptions = [
    {
      value: 'node',
      label: 'Node.js',
      url: 'https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=1',
      description:
        '各种各样的合集 Node.js 是一个开源的、跨平台的 JavaScript 运行时环境，能够让你在服务器端运行 JavaScript。它基于 Chrome 的 V8 引擎构建，提供了丰富的内置模块，使得开发者可以轻松地构建高性能的网络应用程序。'
    },
    {
      value: 'nvm',
      label: 'nvm',
      url: 'https://github.com/coreybutler/nvm-windows/releases/download/1.2.2/nvm-setup.exe',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=2',
      description: 'A node.js version management utility for Windows. Ironically written in Go.'
    },
    {
      value: 'fnm',
      label: 'fnm',
      url: 'https://github.com/Schniz/fnm/releases/latest',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=2',
      description: 'Fast and simple Node.js version manager, built in Rust.'
    },
    {
      value: 'volta',
      label: 'Volta',
      url: 'https://github.com/volta-cli/volta/releases/latest',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=2',
      description: 'A hassle-free JavaScript tool manager.'
    },
    {
      value: 'docker',
      label: 'Docker',
      url: 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=3',
      description:
        'Docker 是一个用于开发、交付和运行应用程序的开放平台。Docker 使您能够将应用程序与基础设施分离，从而可以快速交付软件。使用 Docker，您可以用管理应用程序的方式来管理基础设施。通过利用 Docker 在代码交付、测试和部署方面的方法，您可以显著减少从编写代码到在生产环境中运行之间的延迟。'
    },
    {
      value: 'git',
      label: 'Git',
      url: 'https://git-scm.com/download/win',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=4',
      description: 'Git 是一个分布式版本控制系统，用于跟踪计算机文件的更改，协助多人之间的协作。'
    },
    {
      value: 'vscode',
      label: 'Visual Studio Code',
      url: 'https://update.code.visualstudio.com/latest/win32-x64-user/stable',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=5',
      description:
        'Visual Studio Code 是一款由微软开发的免费开源代码编辑器，支持多种编程语言和丰富的扩展功能。'
    },
    {
      value: 'chrome',
      label: 'Google Chrome',
      url: 'https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B5C6C8A6B-1B8F-4C2D-8E2D-5E1F1F5C6A7B%7D%26lang%3Den%26browser%3D4%26usagestats3D0%26appname%3DChrome%26needsadmin%3Dtrue/update2/installers/ChromeSetup.exe',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=6',
      description:
        'Google Chrome 是由 Google 开发的一款跨平台的网页浏览器，因其速度快、界面简洁和强大的扩展功能而广受欢迎。'
    },
    {
      value: 'firefox',
      label: 'Mozilla Firefox',
      url: 'https://download-installer.cdn.mozilla.net/pub/firefox/releases/114.0/win64/zh-CN/Firefox%20Setup%20114.0.exe',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=7',
      description:
        'Mozilla Firefox 是一款由 Mozilla 基金会开发的免费开源网页浏览器，因其速度快、隐私保护和丰富的扩展功能而广受欢迎。'
    },
    {
      value: 'edge',
      label: 'Microsoft Edge',
      url: 'https://www.microsoft.com/edge',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=8',
      description:
        'Microsoft Edge 是由微软开发的一款网页浏览器，基于 Chromium 内核，提供了更快的浏览速度和更好的兼容性。'
    },
    {
      value: 'apifox',
      label: 'Apifox',
      url: 'https://www.apifox.cn/download',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=9',
      description:
        'Apifox 是一款集 API 文档、接口测试、Mock 数据和接口调试于一体的工具，旨在提高开发效率和团队协作。'
    },
    {
      value: 'postman',
      label: 'Postman',
      url: 'https://www.postman.com/downloads/',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=10',
      description:
        'Postman 是一款用于 API 开发的协作平台，提供了丰富的功能来帮助开发者设计、测试和文档化 API。'
    },
    {
      value: 'insomnia',
      label: 'Insomnia',
      url: 'https://insomnia.rest/download',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=11',
      description:
        'Insomnia 是一款用于 API 开发的协作平台，提供了丰富的功能来帮助开发者设计、测试和文档化 API。'
    },
    {
      value: 'charles',
      label: 'Charles',
      url: 'https://www.charlesproxy.com/download/latest-release/',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=12',
      description: 'Charles 是一款跨平台的网络抓包工具，能够帮助开发者分析和调试网络请求。'
    },
    {
      value: 'fiddler',
      label: 'Fiddler',
      url: 'https://www.telerik.com/fiddler',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=13',
      description: 'Fiddler 是一款用于调试 HTTP 请求的代理工具，能够帮助开发者分析和修改网络流量。'
    },
    {
      value: 'vim',
      label: 'gVim',
      url: 'https://www.vim.org/download.php',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=14',
      description: 'gVim 是一款高度可定制的文本编辑器，广泛用于程序开发和系统管理。'
    },
    {
      value: 'sublime-text',
      label: 'Sublime Text',
      url: 'https://www.sublimetext.com/3',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=15',
      description:
        'Sublime Text 是一款轻量级且功能强大的文本编辑器，广泛用于代码编写和文本处理，支持多种编程语言和插件扩展。'
    },
    {
      value: 'clash',
      label: 'Clash for Windows',
      url: 'https://github.com/Dreamacro/clash/releases/latest/download/Clash.for.Windows.zip',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=16',
      description:
        'Clash for Windows 是一款基于 Clash 的 Windows 平台客户端，提供了图形化界面和丰富的功能。'
    },
    {
      value: 'geek',
      label: 'Geek Uninstaller',
      url: 'https://geekuninstaller.com/download',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=17',
      description: 'Geek Uninstaller 是一款轻量级的应用程序卸载工具，能够彻底删除软件及其残留文件。'
    },
    {
      value: 'HBuilderX',
      label: 'HBuilder X',
      url: 'https://www.dcloud.io/hbuilderx.html',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=18',
      description:
        'HBuilder X 是一款由 DCloud 开发的跨平台集成开发环境（IDE），专注于 HTML5 和移动应用开发，提供了丰富的功能和工具。'
    },
    {
      value: 'deveco-studio',
      label: 'Deveco Studio',
      url: 'https://deveco.com/download',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=19',
      description:
        'Deveco Studio 是一款集成开发环境，专为提高开发者的工作效率而设计，提供了丰富的功能和工具支持多种编程语言。'
    },
    {
      value: 'wechat-devtools',
      label: '微信开发者工具',
      url: 'https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=20',
      description:
        '微信开发者工具是一个为微信小程序和小游戏开发者提供的集成开发环境，支持快速开发、调试和预览。'
    },
    {
      value: 'cursor',
      label: 'Cursor',
      url: 'https://www.cursor.so/download',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=21',
      description:
        'Cursor 是一款 AI 驱动的代码编辑器，旨在通过智能补全和代码生成来提升开发者的编程效率。'
    },
    {
      value: 'zed',
      label: 'Zed',
      url: 'https://zed.dev/download/',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=23',
      description:
        'Zed 是一款现代化的代码编辑器，专注于提供快速响应和高效的开发体验，支持多种编程语言和协作功能。'
    },
    {
      value: 'utools',
      label: 'uTools',
      url: 'https://u.tools/downloads',
      icon: 'https://api.dicebear.com/7.x/miniavs/svg?seed=22',
      description: 'uTools 是一款集成了多种实用工具的桌面应用，旨在提高用户的工作效率和便捷性。'
    }
  ]

  useEffect(function () {
    void invoke<OSGenre>('system:os').then(updateOS)
  }, [])

  return (
    <WindowFrame
      title={findComponentLabel('developer')}
      isScrollable={false}>
      <div className="flex min-h-0 flex-1 items-stretch gap-1.5 p-1.5">
        <div className="w-34 shrink-0 overflow-y-auto scroll-smooth">
          <ToggleGroup
            orientation="vertical"
            spacing={0}
            value={[segmented]}
            onValueChange={function (value) {
              const next = value[0] as SegmentedGenre | undefined
              if (next) updateSegmented(next)
            }}
            className="w-full items-stretch rounded-lg border border-border bg-card p-1 shadow-sm">
            {segmentedOptions.map(function (option) {
              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="h-8 justify-start gap-2 px-2 text-muted-foreground data-[pressed]:bg-primary/10 data-[pressed]:text-primary">
                  <Icon
                    icon={option.icon}
                    aria-hidden
                  />
                  {option.label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Card className="min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4">
            <div>
              <Button
                onClick={function () {
                  updateDrawerVisible(true)
                }}>
                打开控制台
              </Button>
            </div>
            <ul className="flex flex-col divide-y divide-border/60">
              {panelOptions.map(function (item) {
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-4 py-3 first:pt-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <AvatarImage
                            src={item.icon}
                            alt={item.label}
                          />
                        </Avatar>
                        <a
                          href={item.url}
                          className="text-sm font-medium hover:text-primary">
                          {item.label}
                        </a>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4">
                        {PANEL_ACTIONS.map(function (action) {
                          return (
                            <EntriesMarker
                              key={action.key}
                              icon={action.icon}
                              text={action.text}
                            />
                          )
                        })}
                      </div>
                    </div>
                    <img
                      draggable={false}
                      crossOrigin="anonymous"
                      alt="entries-mark"
                      src="https://picsum.photos/300"
                      className="aspect-video w-56 shrink-0 rounded-lg object-cover xl:w-64"
                    />
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <Dialog
          open={drawerVisible}
          onOpenChange={updateDrawerVisible}>
          <DialogContent
            showCloseButton={false}
            className="top-0! right-0! left-auto! h-full! max-h-none! w-100 max-w-100! translate-x-0! translate-y-0! rounded-none rounded-l-xl">
            <pre className="text-xs leading-relaxed">{JSON.stringify(OS, null, 2)}</pre>
          </DialogContent>
        </Dialog>
      </div>
    </WindowFrame>
  )
}

interface EntriesMarkerProps {
  icon: string
  text: string
}

function EntriesMarker(props: EntriesMarkerProps) {
  return (
    <span className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
      <Icon
        icon={props.icon}
        aria-hidden
      />
      {props.text}
    </span>
  )
}
