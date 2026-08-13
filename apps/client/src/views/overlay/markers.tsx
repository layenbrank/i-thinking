import { lazy, type ComponentType, type ReactNode } from 'react'

import type { MarkerLayout } from '@/features/magnetic-tile/size'

type MarkerProps = MarkerLayout

type MarkerModule = { default: ComponentType<MarkerProps> }

function lazyMarker(loader: () => Promise<MarkerModule>) {
  return lazy(loader)
}

const BookmarkMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/bookmark/marker')
})
const CalendarMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/calendar/marker')
})
const ClockMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/clock/marker')
})
const CountdownMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/countdown/marker')
})
const CodeMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/code/marker')
})
const ClipchampMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/clipchamp/marker')
})
const CollectionMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/collection/marker')
})
const MarkdownMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/markdown/marker')
})
const MorphMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/morph/marker')
})
const SettingsMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/settings/marker')
})
const IntelligenceMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/intelligence/marker')
})
const NavigationMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/navigation/marker')
})
const MarketplaceMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/marketplace/marker')
})
const DeveloperMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/developer/marker')
})
const SignboardMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/signboard/marker')
})
const GalleryMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/gallery/marker')
})
const CaptureMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/capture/marker')
})
const ExampleMarker = lazyMarker(function () {
  return import('@/features/magnetic-tiles/example/marker')
})

function bindMarker(Marker: ReturnType<typeof lazyMarker>): (layout: MarkerLayout) => ReactNode {
  return function render(layout) {
    return (
      <Marker
        size={layout.size}
        shape={layout.shape}
        direction={layout.direction}
      />
    )
  }
}

/** 浮层 Marker 映射，覆盖全部 MagneticTile.Component */
const MARKERS: Record<MagneticTile.Component, (layout: MarkerLayout) => ReactNode> = {
  bookmark: bindMarker(BookmarkMarker),
  calendar: bindMarker(CalendarMarker),
  clock: bindMarker(ClockMarker),
  countdown: bindMarker(CountdownMarker),
  code: bindMarker(CodeMarker),
  clipchamp: bindMarker(ClipchampMarker),
  collection: bindMarker(CollectionMarker),
  markdown: bindMarker(MarkdownMarker),
  morph: bindMarker(MorphMarker),
  settings: bindMarker(SettingsMarker),
  intelligence: bindMarker(IntelligenceMarker),
  navigation: bindMarker(NavigationMarker),
  marketplace: bindMarker(MarketplaceMarker),
  developer: bindMarker(DeveloperMarker),
  signboard: bindMarker(SignboardMarker),
  gallery: bindMarker(GalleryMarker),
  capture: bindMarker(CaptureMarker),
  example: bindMarker(ExampleMarker)
}

function RenderMarker(component: MagneticTile.Component, layout: MarkerLayout): ReactNode {
  return MARKERS[component](layout)
}

export { MARKERS, RenderMarker }
