import { clsx } from 'clsx'
import { Select, Space, Button } from 'antd'
import { Swiper, type SwiperClass, SwiperSlide, useSwiper, type SwiperRef } from 'swiper/react'
import { Navigation, Pagination, Scrollbar, A11y, Virtual } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/virtual'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { OPTIONS } from '@/constants/mirror.ts'
import { Reflection } from '@/features/controller/reflection.tsx'
import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/magnetic-tiles/marketplace/workspace/booth/section.module.scss'

// interface SectionProps {
// }

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

export function Section() {
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
            key={optionv.component}
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
  const [size, onUpdateSize] = useState(props.size)
  const [shape, onUpdateShape] = useState(props.shape)
  const [direction, onUpdateDirection] = useState(props.direction)

  function onSlide(swiper: SwiperClass) {
    console.log('onSlide realIndex', swiper.realIndex)

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
    // console.log('[onChangeSize] index', index)
    useSwiper().slideToLoop(index)
  }

  function onChangeShape(value: Mirror.Shape) {
    onUpdateShape(value)
  }

  function onChangeDirection(value: Mirror.Direction) {
    onUpdateDirection(value)
  }

  return (
    <div className={clsx(SModule.container)}>
      <div className={clsx(SModule.wrappr)}>
        <div className={clsx(SModule.head)}>
          <span className={clsx(SModule.title)}>{props.title}</span>
          <span className={clsx(SModule.description)}>{props.description}</span>
          <span className={clsx(SModule.download)}>{props.downloadCount}</span>
        </div>
        {/* <div className={clsx(SModule.body)}> */}
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
        {/* </div> */}
      </div>

      <Swiper
        virtual
        navigation
        loop={true}
        spaceBetween={0}
        slidesPerView={1}
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
    </div>
  )
}

export default Section
