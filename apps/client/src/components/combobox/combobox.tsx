import { clsx } from 'clsx'
import type { CompositionEvent, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useResize } from '@/hooks/useResize'

import styles from '@/components/combobox/combobox.module.scss'
import '@/components/combobox/combobox.scss'

type onUpdateEvent = (
  value: string,
  domStringified: string,
  event: FormEvent<HTMLInputElement>
) => void

interface ComboboxProps {
  value?: string
  placeholder?: string
  className?: string
  offset?: number
  classNames?: {
    root?: string
    trigger?: string
    section?: string
  }
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  section: React.ReactNode
  visible?: boolean
  onUpdate?: onUpdateEvent
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

function Provider(props: ComboboxProps) {
  const [isComposing, onUpdateComposing] = useState(false)
  const [offsetY, updateOffsetY] = useState(0)
  const resizableRef = useResize<HTMLDivElement>(function (value) {
    updateOffsetY(value.height)
  })

  function onUpdate(event: FormEvent<HTMLInputElement>) {
    if (isComposing) return

    const target = event.currentTarget
    const value = target.value ?? ''
    const DOMStringified = target.innerHTML ?? ''

    props.onUpdate?.(value, DOMStringified, event)
  }

  function onCompositionBegin() {
    onUpdateComposing(true)
  }

  function onCompositionFinal(event: CompositionEvent<HTMLInputElement>) {
    const target = event.currentTarget
    onUpdateComposing(function () {
      return false
    })
    // 输入法输入结束后，获取最终内容并触发更新
    const value = target.value ?? ''
    const DOMStringified = target.innerHTML ?? ''

    props.onUpdate?.(value, DOMStringified, event)
  }

  return (
    <div
      onClick={props.onClick}
      ref={resizableRef}
      style={{
        // '--combobox-height': `${DOMRect?.height ?? 0}px`,
        '--combobox-section-offset': `${props.offset ?? offsetY}px`
      }}
      className={clsx([
        'combobox',
        styles.combobox,
        styles.root,
        props.className,
        props.classNames?.root,
        {
          'is-active': props.visible
        }
      ])}>
      <div
        className={clsx([
          'combobox-trigger',
          styles.combobox,
          styles.trigger,
          props.classNames?.trigger
        ])}>
        {props.prefix}
        <input
          type="text"
          onInput={onUpdate}
          value={props.value}
          placeholder={props.placeholder}
          onCompositionEnd={onCompositionFinal}
          onCompositionStart={onCompositionBegin}
          className={clsx([
            'combobox-composer',
            styles.combobox,
            styles.composer
          ])}
        />
        {props.suffix}
      </div>
      <AnimatePresence>
        {props.visible && (
          <motion.div
            key="combobox-section" // 必须设置key，用于识别组件身份
            initial={{ opacity: 0, y: 0 }} // 初始状态
            animate={{ opacity: 1, y: 0 }} // 动画目标状态
            exit={{ opacity: 0, y: 0 }} // 退出状态
            transition={{
              duration: 0.3,
              ease: [0.165, 0.84, 0.44, 1]
            }}
            className={clsx([
              'combobox-section',
              styles.combobox,
              styles.section,
              props.classNames?.section
            ])}>
            {props.section}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface CollectionOption {
  label: string
  value: string
  key: string
  mark?: React.ReactNode
}

interface CollectionProps {
  options: CollectionOption[]
  single?: (option: CollectionOption) => React.ReactNode
}

function Collection(props: CollectionProps) {
  return (
    <div className="combobox-collection">
      {props.options.map(function (option) {
        return (
          <div
            key={option.key}
            datatype={option.value}
            className="single-combobox">
            {props.single?.(option) ?? (
              <Rollback.Single
                label={option.label}
                value={option.value}
                mark={option.mark}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface SingleProps {
  label: string
  value: string
  mark: React.ReactNode
}

const Rollback = {
  Single(option: SingleProps) {
    return (
      <>
        {option.mark}
        <span> {option.label} </span>
      </>
    )
  }
}

export {
  Provider,
  Collection,
  type ComboboxProps,
  type CollectionProps,
  type CollectionOption
}
