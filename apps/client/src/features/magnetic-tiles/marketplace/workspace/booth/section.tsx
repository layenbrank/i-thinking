import { Select, Space, Button } from 'antd'
import { clsx } from 'clsx'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { Swiper, type SwiperClass, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Virtual } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/virtual'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { Reflection } from '@/features/controller/reflection.tsx'
import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/magnetic-tiles/marketplace/workspace/booth/section.module.scss'

interface SizeOption {
  label: string
  value: Mirror.Size
}

interface ShapeOption {
  label: string
  value: Mirror.Shape
}

interface DirectionOption {
  label: string
  value: Mirror.Direction
}

const SIZES: SizeOption[] = [
  { label: '迷你', value: 'mini' },
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
  { label: '超大', value: 'huge' },
  { label: '极大', value: 'ultra' },
  { label: '巨大', value: 'massive' }
]

const SHAPES: ShapeOption[] = [
  { label: '矩形', value: 'rectangle' },
  { label: '正形', value: 'square' },
  { label: '圆形', value: 'circle' }
]

const DIRECTIONS: DirectionOption[] = [
  { label: '水平', value: 'horizontal' },
  { label: '垂直', value: 'vertical' }
]

const VISIBLE_ROOT_MARGIN = '120px 0px'

function useIsVisible(ref: RefObject<HTMLElement | null>) {
  const [isVisible, onUpdateVisible] = useState(false)

  useEffect(
    function () {
      const node = ref.current
      if (!node || isVisible) return

      const observer = new IntersectionObserver(
        function (entries) {
          const entry = entries[0]
          if (!entry?.isIntersecting) return
          onUpdateVisible(true)
          observer.disconnect()
        },
        { root: null, rootMargin: VISIBLE_ROOT_MARGIN, threshold: 0.01 }
      )

      observer.observe(node)

      return function () {
        observer.disconnect()
      }
    },
    [ref, isVisible]
  )

  return isVisible
}

function Section() {
  const size: Mirror.Size = 'mini'
  const shape: Mirror.Shape = 'rectangle'
  const direction: Mirror.Direction = 'horizontal'
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)

  return (
    <div className={clsx([SModule.section, SModule.root])}>
      {magneticTiles.map(function (optionv) {
        return (
          <ReBooth
            {...optionv}
            size={size}
            shape={shape}
            direction={direction}
            key={optionv.id}
          />
        )
      })}
    </div>
  )
}

interface ReBoothProps extends MagneticTile {
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

function ReBooth(props: ReBoothProps) {
  const Component = Reflection[props.component]
  const rootRef = useRef<HTMLDivElement>(null)
  const swiperRef = useRef<SwiperClass | null>(null)
  const isVisible = useIsVisible(rootRef)
  const [size, onUpdateSize] = useState(props.size)
  const [shape, onUpdateShape] = useState(props.shape)
  const [direction, onUpdateDirection] = useState(props.direction)

  function onSlide(swiper: SwiperClass) {
    onUpdateSize(function (prev) {
      const value = SIZES.map((i) => i.value)[swiper.realIndex]
      if (value) return value
      return prev
    })
  }

  function onChangeSize(value: Mirror.Size) {
    onUpdateSize(value)
    const index = SIZES.findIndex((i) => i.value === value)
    if (index === -1) return
    swiperRef.current?.slideToLoop(index)
  }

  function onChangeShape(value: Mirror.Shape) {
    onUpdateShape(value)
  }

  function onChangeDirection(value: Mirror.Direction) {
    onUpdateDirection(value)
  }

  return (
    <div
      ref={rootRef}
      className={clsx(SModule.container)}>
      <div className={clsx(SModule.wrappr)}>
        <div className={clsx(SModule.head)}>
          <span className={clsx(SModule.title)}>{props.title}</span>
          <span className={clsx(SModule.description)}>{props.description}</span>
          <span className={clsx(SModule.download)}>{props.downloadCount}</span>
        </div>
        <Space.Compact
          orientation="horizontal"
          className={clsx(SModule.body)}>
          <Select
            value={size}
            defaultValue={size}
            onChange={onChangeSize}
            options={SIZES}
          />
          <Select
            value={shape}
            defaultValue={shape}
            onChange={onChangeShape}
            options={SHAPES}
          />
          <Select
            value={direction}
            defaultValue={direction}
            onChange={onChangeDirection}
            options={DIRECTIONS}
          />
          <Button
            type="primary"
            rootClassName={clsx(SModule.increment)}>
            新增
          </Button>
        </Space.Compact>
      </div>

      {isVisible ? (
        <Swiper
          virtual
          navigation
          loop={true}
          spaceBetween={0}
          slidesPerView={1}
          onSwiper={function (swiper) {
            swiperRef.current = swiper
          }}
          onSlideChange={onSlide}
          scrollbar={{ draggable: true }}
          className={clsx(SModule.swiper)}
          pagination={{ clickable: true }}
          modules={[Navigation, Pagination, A11y, Virtual]}>
          {SIZES.map(function (sizev) {
            return (
              <SwiperSlide
                key={sizev.value}
                className={clsx(
                  SModule.slide,
                  SModule[props.size],
                  SModule[props.shape],
                  SModule[props.direction]
                )}>
                {sizev.value === size && (
                  <MagneticTile.Suspense
                    size={props.size}
                    shape={props.shape}
                    direction={props.direction}>
                    <OverlayProvider>
                      <Component {...props} />
                    </OverlayProvider>
                  </MagneticTile.Suspense>
                )}
              </SwiperSlide>
            )
          })}
        </Swiper>
      ) : (
        <MagneticTile.Skeleton
          size={props.size}
          shape={props.shape}
          direction={props.direction}
          className={clsx(SModule.swiper, SModule.skeleton)}
        />
      )}
    </div>
  )
}

export default Section
