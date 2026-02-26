import { clsx } from 'clsx'

import { Overlay } from '@/views/intelligence/overlay/index.ts'

export default function Intelligence() {
  return (
    <div className={clsx(['size-full flex flex-col'])}>
      <Overlay.Utility />
      <div className={clsx(['flex-1 flex w-full min-h-0'])}>
        <Overlay.Navigation />
        <Overlay.Section />
      </div>
      <Overlay.Summary />
    </div>
  )
}
