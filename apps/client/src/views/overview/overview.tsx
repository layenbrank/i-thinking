import { Input, Layout as Payload, FloatButton } from 'antd'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useClickOutside, useFocus, useActiveElement } from '@reactuses/core'
import { Icon } from '@iconify/react'

import ReSignIn from '@/features/signin/signin.tsx'
import Controller from '@/features/controller/controller.tsx'
import styles from '@/views/overview/overview.module.scss'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
  const engineRef = useRef<HTMLDivElement>(null)

  const [keyword, onUpdateKeyword] = useState<string>('')
  const [visible, onUpdateVisible] = useState<boolean>(false)
  const [signinOpen, setSigninOpen] = useState(false)

  const activeEngine = useActiveElement<HTMLElement>()
  // const [engine, onUpdateEngine] = useFocus(engineRef)

  useClickOutside(engineRef, function () {
    onUpdateVisible(false)
  })

  const isActive = visible

  function onChangeKeyword(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    onUpdateKeyword(value)
    onUpdateVisible(value.length > 0)
  }

  function onOpenSignin() {
    setSigninOpen(true)
  }

  function onCloseSignin() {
    setSigninOpen(false)
  }

  function onEngineClick() {
    if (keyword) {
      onUpdateVisible(true)
    }
  }

  return (
    <Payload className={clsx(styles.overview, styles.payload)}>
      <Prefix className={clsx(styles.overview, styles.prefix)}>
        <div
          ref={engineRef}
          onClick={onEngineClick}
          className={clsx(styles.engine, styles.section, { [styles.active]: isActive })}>
          <Input.Search
            value={keyword}
            onChange={onChangeKeyword}
            classNames={{
              root: clsx(styles.engine, styles.keyword),
              input: clsx(styles.engine, styles.trigger),
              button: {
                root: clsx(styles.engine, styles.series),
                icon: clsx(styles.engine, styles.mark)
              }
            }}
          />
          <AnimatePresence>
            {visible && (
              <ReFragment
                keyword={keyword}
                series={[]}
              />
            )}
          </AnimatePresence>
        </div>
      </Prefix>
      <Core className={clsx(styles.overview, styles.core)}>
        <Controller.Mirror>
          <Controller.MagneticTile />
        </Controller.Mirror>
      </Core>
      <Suffix className={clsx(styles.overview, styles.suffix)}>footer</Suffix>
      <FloatButton.Group
        trigger="click"
        placement="top"
        style={{
          bottom: 30,
          insetInlineEnd: 30,
          position: 'absolute'
        }}
        icon={<Icon icon="ant-design:arrow-up-outlined" />}>
        <FloatButton
          icon={<Icon icon="ant-design:login-outlined" />}
          onClick={onOpenSignin}
        />
        <FloatButton icon={<Icon icon="ant-design:logout-outlined" />} />
      </FloatButton.Group>
      <ReSignIn
        open={signinOpen}
        onClose={onCloseSignin}
      />
    </Payload>
  )
}

interface FragmentSeries {
  label: string
  value: string
}

interface FragmentProps {
  keyword: string
  series: FragmentSeries[]
}

function ReFragment(props: FragmentProps) {
  const { keyword } = props

  const series = useMemo(
    function () {
      return Array.from({ length: 30 }).map(function (value, index) {
        return {
          label: `${keyword}-${index + 1}`,
          value: `${keyword}-${index + 1}`
        }
      })
    },
    [props.series]
  )

  return (
    <motion.div
      initial={{
        opacity: 0,
        scaleY: 0.6, // 从 0.6 而不是 0，减少“突然出现”感
        y: -4
      }}
      animate={{
        opacity: 1,
        scaleY: 1,
        y: 0
      }}
      exit={{
        opacity: 0,
        scaleY: 0.85, // exit 时不要缩得太小，更优雅
        y: -2
      }}
      transition={{
        duration: 0.26,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{ transformOrigin: 'top' }}
      className={clsx(styles.engine, styles.fragment)}>
      {series.map(function (value) {
        return (
          <div
            key={value.value}
            className={clsx(styles.engine, styles.fragmentValue)}>
            <span> {value.label}</span>
            <Icon icon="mdi:arrow-right"></Icon>
          </div>
        )
      })}
    </motion.div>
  )
}
