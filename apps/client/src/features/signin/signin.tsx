import { Icon } from '@iconify/react/offline'
import { Dialog, DialogContent, DialogTitle } from '@i-thinking/design/components/dialog'
import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

import {
  HEAD,
  MODE,
  MOTION,
  PANEL,
  type AuthMode,
  type PanelView
} from '@/features/signin/constants.ts'
import { ForgotForm } from '@/features/signin/forgot-form.tsx'
import { SigninForm } from '@/features/signin/signin-form.tsx'
import { SignupForm } from '@/features/signin/signup-form.tsx'
import styles from '@/features/signin/signin.module.scss'

type SignInProps = {
  open: boolean
  onClose: () => void
}

function SignIn(props: SignInProps) {
  const { open, onClose } = props
  const isReducedMotion = useReducedMotion()
  const [panelView, setPanelView] = useState<PanelView>(PANEL.SIGNIN)
  const [signinMode, setSigninMode] = useState<AuthMode>(MODE.USERNAME)
  const [forgotMode, setForgotMode] = useState<AuthMode>(MODE.USERNAME)
  const [panelMotionKey, setPanelMotionKey] = useState(0)

  const headText = HEAD[panelView]
  const headVariants = MOTION.variants({
    isReducedMotion: !!isReducedMotion,
    offset: MOTION.OFFSET.HEAD
  })
  const viewVariants = MOTION.fadeVariants(!!isReducedMotion)
  const viewTransition = MOTION.transition(!!isReducedMotion)

  useEffect(
    function () {
      if (open) return

      setPanelView(PANEL.SIGNIN)
      setSigninMode(MODE.USERNAME)
      setForgotMode(MODE.USERNAME)
    },
    [open]
  )

  function bumpPanelMotion() {
    setPanelMotionKey(function (key) {
      return key + 1
    })
  }

  function onForgot() {
    setForgotMode(signinMode)
    setPanelView(PANEL.FORGOT)
    bumpPanelMotion()
  }

  function onSignup() {
    setPanelView(PANEL.SIGNUP)
    bumpPanelMotion()
  }

  function onSignin() {
    setPanelView(PANEL.SIGNIN)
    bumpPanelMotion()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={function (nextOpen) {
        if (!nextOpen) onClose()
      }}>
      <DialogContent
        className={clsx(
          styles.dialog,
          'max-w-none gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none'
        )}>
        <DialogTitle className="sr-only">登录 i-thinking</DialogTitle>
        <div className={styles.body}>
          <aside className={styles.brand}>
            <div className={styles.core}>
              <div className={styles.logo}>
                <Icon
                  icon="lucide:lightbulb"
                  aria-hidden
                />
              </div>
              <h3>i-thinking</h3>
              <p>企业智能工作台，赋能团队高效决策与协作</p>
            </div>
            <ul className={styles.points}>
              <li>
                <Icon icon="lucide:shield-check" />
                <span>企业级安全防护</span>
              </li>
              <li>
                <Icon icon="lucide:refresh-cw" />
                <span>多端数据实时同步</span>
              </li>
              <li>
                <Icon icon="lucide:users" />
                <span>智能协作工作流</span>
              </li>
            </ul>
            <footer className={styles.foot}>© 2026 i-thinking · SSL 加密传输</footer>
          </aside>
          <section className={styles.panel}>
            <AnimatePresence
              mode="wait"
              initial={false}>
              <motion.header
                key={panelView}
                className={styles.head}
                initial={headVariants.initial}
                animate={headVariants.animate}
                exit={headVariants.exit}
                transition={viewTransition}>
                <h4 className="text-base font-medium">{headText.title}</h4>
                <span className="text-sm text-muted-foreground">{headText.subtitle}</span>
              </motion.header>
            </AnimatePresence>
            <div className={styles.stage}>
              {/* stage 不用 initial={false}：会经 PresenceContext 屏蔽嵌套 FormStagger 进场 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={panelView}
                  initial={viewVariants.initial}
                  animate={viewVariants.animate}
                  exit={viewVariants.exit}
                  transition={viewTransition}
                  className={clsx(
                    styles.formWrap,
                    panelView === PANEL.FORGOT && styles.formWrapScroll
                  )}>
                  {panelView === PANEL.SIGNIN && (
                    <SigninForm
                      motionKey={panelMotionKey}
                      signinMode={signinMode}
                      onModeChange={setSigninMode}
                      onForgot={onForgot}
                      onSignup={onSignup}
                      onSuccess={onClose}
                    />
                  )}
                  {panelView === PANEL.FORGOT && (
                    <ForgotForm
                      motionKey={panelMotionKey}
                      forgotMode={forgotMode}
                      onModeChange={setForgotMode}
                      onSignin={onSignin}
                    />
                  )}
                  {panelView === PANEL.SIGNUP && (
                    <SignupForm
                      motionKey={panelMotionKey}
                      onSignin={onSignin}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SignIn

export type { SignInProps }
