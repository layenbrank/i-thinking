import { clsx, type ClassValue } from 'clsx'

interface FlipDigitProps {
  total?: number
  current?: number
}

function FlipDigit(props: FlipDigitProps) {
  const total = 9
  const [isFlipping, setIsFlipping] = useState(false)
  const [current, setCurrent] = useState(0)
  const [previousDigit] = useState(
    props.total === props.current ? -1 : props.total
  )

  return (
    <div className={clsx([{ 'flip-animation': isFlipping }])}>
      <ul className={clsx('flip-digit')}>
        {Array.from({ length: total + 1 }).map(function (_, digit) {
          return (
            <li
              key="digit"
              className={clsx('digit-item', {
                'digit-active': current === digit,
                'digit-previous': digit === previousDigit
              })}>
              <div className="digit-top">
                <div className="digit-shadow"></div>
                <div className="digit-text">{digit}</div>
              </div>
              <div className="digit-bottom">
                <div className="digit-shadow"></div>
                <div className="digit-text">{digit}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
