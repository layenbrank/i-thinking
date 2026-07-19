import { useResize } from '@i-thinking/hooks'
import styles from '@/components/scroll/scroll.module.scss'
import { clsx, type ClassValue } from 'clsx'

interface XScrollProps {
  children: React.ReactNode
  className?: ClassValue
  classNames?: {
    root?: ClassValue
    wrapper?: ClassValue
    inner?: ClassValue
  }
  style?: React.CSSProperties
  styles?: {
    root?: React.CSSProperties
    wrapper?: React.CSSProperties
    inner?: React.CSSProperties
  }
  onScroll?: (event: React.UIEvent<HTMLDivElement, UIEvent>) => void
}

const Scroll = {
  X(props: XScrollProps) {
    const [size, updateSize] = useState<DOMRect>()

    const properties = useMemo<React.CSSProperties>(
      function () {
        return {
          '--scroll-x-width': size ? `${size.width}px` : '0px',
          '--scroll-x-height': size ? `${size.height}px` : '0px'
        }
      },
      [size]
    )

    const nodeRef = useResize<HTMLDivElement>(
      useCallback(function (DOMRect) {
        updateSize(DOMRect)
      }, [])
    )

    return (
      <div
        ref={nodeRef}
        style={{ ...properties, ...props.style, ...props.styles?.root }}
        className={clsx([
          props.className,
          props.classNames?.root,
          styles.scroll,
          styles.section
        ])}>
        <div
          onScroll={props.onScroll}
          style={props.styles?.wrapper}
          className={clsx([
            props.classNames?.wrapper,
            styles.scroll,
            styles.wrapper
          ])}>
          <div
            style={props.styles?.inner}
            className={clsx([
              props.classNames?.inner,
              styles.scroll,
              styles.inner
            ])}>
            {props.children}
          </div>
        </div>
      </div>
    )
  },
  Y() {}
}

export { Scroll }
