import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import {
  CLOSE_PAYMENT_ORDER,
  CREATE_PAYMENT_ORDER,
  GET_PAYMENT_CATALOG,
  GET_PAYMENT_ORDER,
  GET_TENANT_ORDERS,
  SYNC_PAYMENT_ORDER,
  type CreateOrderInput,
  type PaymentCatalog,
  type PaymentOrder
} from '@/apis/payment.ts'
import { ORDER_PAID, ORDER_POLL_INTERVAL_MS, shouldPollOrder } from '@/features/payment/checkout.ts'
import { useInvalidateQuota } from '@/features/quota/usage.ts'

/**
 * 收银台的查询与变更。
 *
 * 订单状态**不由客户端推进**：下单后能变的只有服务端（渠道回调或 `sync` 向上游查单）。所以这里
 * 只做三件事 —— 轮询看有没有变、点「刷新支付状态」时手动 `sync`、以及付款成功后让额度重新取数。
 *
 * 轮询与 `sync` 的分工：轮询只是让「付完了」更快显示出来，`sync` 才是回调丢失时的兜底（它真的去
 * 上游查单并核销）。因此停止轮询不会漏单，用户还能手动兜回来。
 */

const PAYMENT_KEY = 'payment'

function usePaymentCatalog(tenantID: string | null) {
  return useQuery<PaymentCatalog>({
    queryKey: [PAYMENT_KEY, 'catalog', tenantID],
    enabled: Boolean(tenantID),
    queryFn: function () {
      if (!tenantID) throw new Error('[payment] 缺少租户')
      return GET_PAYMENT_CATALOG(tenantID)
    }
  })
}

/** 订单历史（服务端固定返回最近若干条，所以不做分页） */
function useTenantOrders(tenantID: string | null) {
  return useQuery<PaymentOrder[]>({
    queryKey: [PAYMENT_KEY, 'orders', tenantID],
    enabled: Boolean(tenantID),
    queryFn: function () {
      if (!tenantID) throw new Error('[payment] 缺少租户')
      return GET_TENANT_ORDERS(tenantID)
    }
  })
}

/**
 * 单笔订单（收银台盯着它）。
 *
 * 待支付期间按 `ORDER_POLL_INTERVAL_MS` 轮询，已支付 / 已关闭 / 已过期就停 —— 停的条件由
 * `shouldPollOrder` 决定，不在这里再写一遍状态判断。一旦观察到已支付，立刻让额度与订阅失效，
 * 界面上的「剩余额度」不用等用户手动刷新。
 */
function usePaymentOrder(tenantID: string | null, orderNo: string | null) {
  const invalidate = useInvalidateQuota()
  const settled = useRef<string | null>(null)

  const query = useQuery<PaymentOrder>({
    queryKey: [PAYMENT_KEY, 'order', tenantID, orderNo],
    enabled: Boolean(tenantID && orderNo),
    queryFn: function () {
      if (!tenantID || !orderNo) throw new Error('[payment] 缺少订单')
      return GET_PAYMENT_ORDER(tenantID, orderNo)
    },
    refetchInterval: function (live) {
      if (live.state.error) return false
      return shouldPollOrder(live.state.data, Date.now()) ? ORDER_POLL_INTERVAL_MS : false
    }
  })

  const order = query.data
  const status = order ? order.status : null

  useEffect(
    function () {
      if (!orderNo || status !== ORDER_PAID) return
      if (settled.current === orderNo) return
      settled.current = orderNo
      void invalidate()
    },
    [invalidate, orderNo, status]
  )

  return query
}

function useCreateOrder(tenantID: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: function (input: CreateOrderInput) {
      if (!tenantID) throw new Error('[payment] 没有可下单的租户')
      return CREATE_PAYMENT_ORDER(tenantID, input)
    },
    onSuccess: function (order) {
      queryClient.setQueryData([PAYMENT_KEY, 'order', tenantID, order.orderNo], order)
      void queryClient.invalidateQueries({ queryKey: [PAYMENT_KEY, 'orders', tenantID] })
    }
  })
}

/** 主动查单：回调没到 / 用户说「我付了」，点它就向上游核对并核销 */
function useSyncOrder(tenantID: string | null) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateQuota()

  return useMutation({
    mutationFn: function (orderNo: string) {
      if (!tenantID) throw new Error('[payment] 没有可查单的租户')
      return SYNC_PAYMENT_ORDER(tenantID, orderNo)
    },
    onSuccess: function (order) {
      queryClient.setQueryData([PAYMENT_KEY, 'order', tenantID, order.orderNo], order)
      void queryClient.invalidateQueries({ queryKey: [PAYMENT_KEY, 'orders', tenantID] })
      if (order.status === ORDER_PAID) void invalidate()
    }
  })
}

function useCloseOrder(tenantID: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: function (orderNo: string) {
      if (!tenantID) throw new Error('[payment] 没有可关单的租户')
      return CLOSE_PAYMENT_ORDER(tenantID, orderNo)
    },
    onSuccess: function (order) {
      queryClient.setQueryData([PAYMENT_KEY, 'order', tenantID, order.orderNo], order)
      void queryClient.invalidateQueries({ queryKey: [PAYMENT_KEY, 'orders', tenantID] })
    }
  })
}

export {
  PAYMENT_KEY,
  useCloseOrder,
  useCreateOrder,
  usePaymentCatalog,
  usePaymentOrder,
  useSyncOrder,
  useTenantOrders
}
