import { clsx } from 'clsx'
import { Segmented } from 'antd'
import { Swiper, SwiperSlide, useSwiper, useSwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/scrollbar'

import { OPTIONS } from '@/constants/mirror.ts'
import { Reflection } from '@/features/controller/reflection.tsx'

import styles from '@/views/marketplace/overlay/section.module.scss'

// interface SectionProps {
// }

export function Section() {
  return (
    <div className={clsx([styles.section, styles.root])}>
      {OPTIONS.map(function (value) {
        return (
          <div
            key={value.value}
            className={clsx(styles.container)}>
            <div className={clsx(styles.wrappr)}>
              <div className={clsx(styles.head)}>
                <span className={clsx(styles.title)}>title</span>
                <span className={clsx(styles.description)}>description</span>
                <span className={clsx(styles.download)}>download</span>
              </div>
              <div className={clsx(styles.body)}>
                <Segmented
                  options={[
                    {
                      label: '小',
                      value: 'small'
                    },
                    {
                      label: '中',
                      value: 'medium'
                    },
                    {
                      label: '大',
                      value: 'large'
                    }
                  ]}
                  orientation="horizontal"
                  rootClassName={styles.segmented}
                />
              </div>
            </div>
            <Swiper
              loop={true}
              navigation
              spaceBetween={50}
              slidesPerView={1}
              className={clsx(styles.swiper)}
              scrollbar={{ draggable: true }}
              pagination={{ clickable: true }}
              onSwiper={(swiper) => console.log(swiper)}
              onSlideChange={() => console.log('slide change')}
              modules={[Navigation, Pagination, Scrollbar, A11y]}>
              {Array.from({ length: 6 }).map(function (_, index) {
                return (
                  <SwiperSlide
                    key={index}
                    className={clsx(styles.slide)}>
                    Slide {index + 1}
                  </SwiperSlide>
                )
              })}
            </Swiper>
          </div>
        )
      })}
    </div>
  )
}

export default Section
