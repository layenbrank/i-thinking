import { Spinner } from '@i-thinking/design/components/spinner'

export default function RouteFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <Spinner className="size-4 text-muted-foreground" />
    </div>
  )
}
