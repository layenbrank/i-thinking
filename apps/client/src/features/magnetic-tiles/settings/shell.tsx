import { Icon } from '@iconify/react/offline'
import { Typography } from 'antd'
import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

import {
  HEAD,
  MOTION,
  NAVS,
  SECTION,
  type SectionKey
} from '@/features/magnetic-tiles/settings/constant'
import AppearancePanel from '@/features/magnetic-tiles/settings/panels/appearance'
import GeneralPanel from '@/features/magnetic-tiles/settings/panels/general'
import styles from '@/features/magnetic-tiles/settings/shell.module.scss'

function Shell() {
  const isReducedMotion = useReducedMotion()
  const [section, onSectionChange] = useState<SectionKey>(SECTION.APPEARANCE)

  const headText = HEAD[section]
  const headVariants = MOTION.variants({
    isReducedMotion: !!isReducedMotion,
    offset: MOTION.OFFSET.HEAD
  })
  const viewVariants = MOTION.fadeVariants(!!isReducedMotion)
  const viewTransition = MOTION.transition(!!isReducedMotion)

  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <div className={styles.asideHead}>
          <div className={styles.asideTitle}>
            <div className={styles.logo}>
              <Icon
                icon="ant-design:setting-outlined"
                aria-hidden
              />
            </div>
            <Typography.Title
              level={5}
              className={styles.asideTitleText}>
              设置
            </Typography.Title>
          </div>
        </div>

        <nav
          className={styles.nav}
          aria-label="设置分类">
          {NAVS.map(function (nav) {
            const isActive = section === nav.key
            return (
              <button
                key={nav.key}
                type="button"
                className={clsx(
                  styles.navItem,
                  isActive && styles.navItemActive,
                  nav.isDisabled && styles.navItemDisabled
                )}
                aria-current={isActive ? 'page' : undefined}
                disabled={nav.isDisabled}
                onClick={function () {
                  onSectionChange(nav.key)
                }}>
                <Icon
                  icon={nav.icon}
                  aria-hidden
                />
                <span>{nav.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <section className={styles.main}>
        <AnimatePresence
          mode="wait"
          initial={false}>
          <motion.header
            key={section}
            className={styles.head}
            initial={headVariants.initial}
            animate={headVariants.animate}
            exit={headVariants.exit}
            transition={viewTransition}>
            <Typography.Title
              level={4}
              className={styles.headTitle}>
              {headText.title}
            </Typography.Title>
            <Typography.Text
              type="secondary"
              className={styles.headSubtitle}>
              {headText.subtitle}
            </Typography.Text>
          </motion.header>
        </AnimatePresence>

        <div className={styles.stage}>
          <AnimatePresence
            mode="wait"
            initial={false}>
            <motion.div
              key={section}
              className={styles.panelWrap}
              initial={viewVariants.initial}
              animate={viewVariants.animate}
              exit={viewVariants.exit}
              transition={viewTransition}>
              {section === SECTION.GENERAL && <GeneralPanel />}
              {section === SECTION.APPEARANCE && <AppearancePanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}

export default Shell
