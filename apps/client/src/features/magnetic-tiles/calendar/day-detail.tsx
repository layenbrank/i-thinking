import { Tag } from 'antd'
import { createStyles } from 'antd-style'
import type { Dayjs } from 'dayjs'
import { calendar, timeSphere } from '@i-thinking/utils'

type DayDetailProps = {
  date: Dayjs
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

const useStyle = createStyles(function ({ token, css }) {
  return {
    root: css`
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    `,
    header: css`
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    `,
    titleBlock: css`
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    `,
    solar: css`
      font-size: 16px;
      font-weight: 600;
      color: ${token.colorText};
      line-height: 1.3;
    `,
    lunar: css`
      font-size: 13px;
      color: ${token.colorTextSecondary};
      line-height: 1.4;
    `,
    dayBadge: css`
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: ${token.borderRadiusLG}px;
      background: ${token.colorPrimary};
      color: ${token.colorTextLightSolid};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 600;
      line-height: 1;
    `,
    chips: css`
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    `,
    section: css`
      display: flex;
      flex-direction: column;
      gap: 6px;
    `,
    row: css`
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-size: 12px;
      line-height: 1.5;
    `,
    label: css`
      flex-shrink: 0;
      min-width: 28px;
      font-weight: 600;
      color: ${token.colorTextSecondary};
    `,
    yi: css`
      color: ${token.colorSuccess};
    `,
    ji: css`
      color: ${token.colorError};
    `,
    meta: css`
      font-size: 12px;
      color: ${token.colorTextSecondary};
      line-height: 1.6;
    `,
    body: css`
      color: ${token.colorText};
      word-break: break-all;
    `
  }
})

function directionName(value: { toString(): string } | string): string {
  return typeof value === 'string' ? value : value.toString()
}

function DayDetail(props: DayDetailProps) {
  const { date } = props
  const { styles } = useStyle()
  const key = timeSphere.format(date.toDate(), 'YYYY-MM-DD')
  const lunar = calendar.lunarDay(key)
  const cycle = calendar.sixtyCycle(key)
  const lunarText = calendar.format(key)
  const weekday = WEEKDAY_LABELS[date.day()]

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.solar}>
            {key} 周{weekday}
          </div>
          <div className={styles.lunar}>{lunarText}</div>
          <div className={styles.lunar}>
            {cycle.heavenStem}
            {cycle.earthBranch}（{cycle.zodiac}）年
          </div>
        </div>
        <div className={styles.dayBadge}>{date.date()}</div>
      </div>

      <div className={styles.chips}>
        <Tag>生肖 {lunar.zodiac}</Tag>
        <Tag>星座 {lunar.constellation}</Tag>
        {lunar.festival ? <Tag color="blue">{lunar.festival}</Tag> : null}
        {lunar.phase ? <Tag>{lunar.phase}</Tag> : null}
      </div>

      <div className={styles.section}>
        <div className={styles.row}>
          <span className={`${styles.label} ${styles.yi}`}>宜</span>
          <span className={styles.body}>{lunar.beneficial || '—'}</span>
        </div>
        <div className={styles.row}>
          <span className={`${styles.label} ${styles.ji}`}>忌</span>
          <span className={styles.body}>{lunar.unbeneficial || '—'}</span>
        </div>
      </div>

      <div className={styles.meta}>
        <div>物候：{lunar.phenologyDay || '—'}</div>
        <div>
          喜神 {directionName(lunar.directions.joyDirection)} · 财神{' '}
          {directionName(lunar.directions.wealthDirection)} · 福神{' '}
          {directionName(lunar.directions.mascotDirection)}
        </div>
      </div>
    </div>
  )
}

export { DayDetail }
export type { DayDetailProps }
