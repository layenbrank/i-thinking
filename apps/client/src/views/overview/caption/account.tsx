/**
 * 标题栏的账号入口：未登录是「登录」按钮，已登录是头像菜单（退出登录）。
 *
 * 取代原 OverviewCapsule 里的账号位；登录弹窗仍由主窗口持有（`ReSignIn`）。
 */
import { Icon } from '@iconify/react/offline'
import { Avatar, AvatarFallback, AvatarImage } from '@i-thinking/design/components/avatar'
import { Button } from '@i-thinking/design/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'

import { useSessionStore } from '@/stores/session.ts'
import styles from '@/views/overview/caption/caption.module.scss'

type CaptionAccountProps = {
  onSignIn: () => void
}

function CaptionAccount(props: CaptionAccountProps) {
  const user = useSessionStore(function (state) {
    return state.user
  })
  const toSignOut = useSessionStore(function (state) {
    return state.toSignOut
  })

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        data-region="false"
        className={styles.accountSignIn}
        onClick={props.onSignIn}>
        <Icon
          icon="lucide:log-in"
          aria-hidden
        />
        登录
      </Button>
    )
  }

  const initial = user.username.slice(0, 1).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            data-region="false"
            aria-label={`已登录：${user.username}`}
          />
        }>
        <Avatar
          size="sm"
          className={styles.accountAvatar}>
          {user.avatarUrl ? (
            <AvatarImage
              src={user.avatarUrl}
              alt={user.username}
            />
          ) : null}
          <AvatarFallback className="bg-transparent text-[10px] font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-44">
        {/* 标签必须包在 Group 里：design 的 Label 是 base-ui 的 GroupLabel，脱离 Group 会抛 MenuGroupContext is missing */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate text-xs font-medium">
            {user.username}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toSignOut}>
          <Icon
            icon="lucide:log-out"
            aria-hidden
          />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { CaptionAccount }
