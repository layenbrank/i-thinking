import { describe, expect, it } from 'vitest'

import type { PaymentCatalogChannel, PaymentCatalogPlan, PaymentOrder } from '@/apis/payment.ts'
import {
  describePlan,
  findChannelLabel,
  findDefaultChannel,
  findOrderStatusLabel,
  findPlanLabel,
  formatCountdown,
  formatDurationDays,
  formatMoney,
  isOrderClosed,
  isOrderPaid,
  isOrderPending,
  shouldPollOrder,
  sortChannels
} from '@/features/payment/checkout.ts'

/**
 * 收银台只排版不算钱：金额、时长、可售性都是服务端快照，所以这里验证的是「原样搬运 + 显示换算」，
 * 以及「什么时候该停止轮询」这一条客户端自己的策略。
 */

function plan(partial: Partial<PaymentCatalogPlan> = {}): PaymentCatalogPlan {
  return {
    plan: 'pro',
    label: '专业版',
    amount: 1990,
    currency: 'CNY',
    durationDays: 30,
    dailyTokenQuota: 12_500,
    purchasable: true,
    ...partial
  }
}

function channel(partial: Partial<PaymentCatalogChannel> = {}): PaymentCatalogChannel {
  return { code: 'WECHAT', label: '微信支付', enabled: true, ...partial }
}

function order(partial: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    orderNo: 'P1',
    tenantID: 't1',
    plan: 'pro',
    channel: 'WECHAT',
    amount: 1990,
    currency: 'CNY',
    status: 'PENDING',
    codeUrl: 'weixin://pay',
    transactionId: null,
    subscriptionID: null,
    dailyTokenQuota: 12_500,
    durationDays: 30,
    createdAt: 1_700_000_000_000,
    orderExpiresAt: 1_700_000_300_000,
    paidAt: null,
    remark: null,
    ...partial
  }
}

describe('formatMoney', function () {
  it('renders cents as yuan so no float ever reaches the wire', function () {
    expect(formatMoney(0)).toBe('¥0.00')
    expect(formatMoney(5)).toBe('¥0.05')
    expect(formatMoney(1990)).toBe('¥19.90')
    expect(formatMoney(123_456)).toBe('¥1234.56')
  })

  it('falls back to the raw currency code when there is no symbol', function () {
    expect(formatMoney(100, 'USD')).toBe('USD 1.00')
  })
})

describe('formatDurationDays', function () {
  it('spells out the permanent case', function () {
    expect(formatDurationDays(30)).toBe('30 天')
    expect(formatDurationDays(null)).toBe('永久有效')
  })
})

describe('label lookups', function () {
  it('translates known codes and passes unknown ones through', function () {
    expect(findChannelLabel('WECHAT')).toBe('微信支付')
    expect(findChannelLabel('ALIPAY')).toBe('支付宝')
    expect(findChannelLabel('UNIONPAY')).toBe('UNIONPAY')

    expect(findOrderStatusLabel('PENDING')).toBe('待支付')
    expect(findOrderStatusLabel('PAID')).toBe('已支付')
    expect(findOrderStatusLabel('CLOSED')).toBe('已关闭')
    expect(findOrderStatusLabel('WHATEVER')).toBe('WHATEVER')
  })

  it('labels the free plan when there is no plan at all', function () {
    expect(findPlanLabel(null)).toBe('免费档')
    expect(findPlanLabel(undefined)).toBe('免费档')
    expect(findPlanLabel(plan())).toBe('专业版（pro）')
    expect(findPlanLabel(plan({ label: '' }))).toBe('pro')
  })
})

describe('describePlan', function () {
  it('folds price, quota and duration into one line', function () {
    expect(describePlan(plan())).toBe('¥19.90 · 1.3 万 tokens/天 · 30 天')
    expect(describePlan(plan({ durationDays: null }))).toBe('¥19.90 · 1.3 万 tokens/天 · 永久有效')
  })
})

describe('order status helpers', function () {
  it('matches exactly one status', function () {
    expect(isOrderPending(order())).toBe(true)
    expect(isOrderPaid(order())).toBe(false)
    expect(isOrderClosed(order())).toBe(false)

    expect(isOrderPaid(order({ status: 'PAID' }))).toBe(true)
    expect(isOrderClosed(order({ status: 'CLOSED' }))).toBe(true)
    expect(isOrderPending(order({ status: 'REFUNDED' }))).toBe(false)
  })
})

describe('shouldPollOrder', function () {
  const now = 1_700_000_100_000

  it('polls only a pending order that has not expired', function () {
    expect(shouldPollOrder(order(), now)).toBe(true)
  })

  it('stops once the order expired, was paid or was closed', function () {
    expect(shouldPollOrder(order({ orderExpiresAt: now }), now)).toBe(false)
    expect(shouldPollOrder(order({ status: 'PAID' }), now)).toBe(false)
    expect(shouldPollOrder(order({ status: 'CLOSED' }), now)).toBe(false)
  })

  it('has nothing to poll without an order', function () {
    expect(shouldPollOrder(null, now)).toBe(false)
    expect(shouldPollOrder(undefined, now)).toBe(false)
  })
})

describe('formatCountdown', function () {
  it('renders m:ss and rounds down', function () {
    expect(formatCountdown(1_700_000_005_000, 1_700_000_000_000)).toBe('0:05')
    expect(formatCountdown(1_700_000_125_999, 1_700_000_000_000)).toBe('2:05')
  })

  it('returns an empty string once the deadline passed', function () {
    expect(formatCountdown(1_700_000_000_000, 1_700_000_000_000)).toBe('')
    expect(formatCountdown(1_699_999_999_000, 1_700_000_000_000)).toBe('')
  })
})

describe('sortChannels', function () {
  it('puts the configured channels first and keeps the rest in place', function () {
    const sorted = sortChannels([
      channel({ code: 'WECHAT', enabled: false }),
      channel({ code: 'ALIPAY', enabled: true })
    ])

    expect(
      sorted.map(function (item) {
        return item.code
      })
    ).toEqual(['ALIPAY', 'WECHAT'])
  })

  it('does not mutate the incoming list', function () {
    const channels = [
      channel({ code: 'WECHAT', enabled: false }),
      channel({ code: 'ALIPAY', enabled: true })
    ]

    sortChannels(channels)
    expect(channels[0].code).toBe('WECHAT')
  })
})

describe('findDefaultChannel', function () {
  it('picks the first usable channel', function () {
    expect(
      findDefaultChannel([
        channel({ code: 'WECHAT', enabled: false }),
        channel({ code: 'ALIPAY', enabled: true })
      ])
    ).toBe('ALIPAY')
  })

  it('returns null when nothing is configured instead of faking a choice', function () {
    expect(findDefaultChannel([channel({ enabled: false })])).toBeNull()
    expect(findDefaultChannel([])).toBeNull()
  })
})
