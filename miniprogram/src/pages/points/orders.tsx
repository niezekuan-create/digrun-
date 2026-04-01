import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import './orders.scss'

interface Order {
  id: number
  points_spent: number
  status: string
  created_at: string
  product?: {
    id: number
    name: string
    image?: string
  }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'status-pending' },
  completed: { label: '已完成', cls: 'status-done' },
  cancelled: { label: '已取消', cls: 'status-cancel' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    loadOrders()
  })

  const loadOrders = async () => {
    try {
      const data = await request<Order[]>({ url: '/points/orders' })
      setOrders(data)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <View className='orders-page'>
      <View className='orders-header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-text'>← 返回</Text>
        </View>
        <Text className='page-title'>我的兑换</Text>
      </View>

      {loading ? (
        <View className='loading'><Text className='loading-text'>LOADING...</Text></View>
      ) : orders.length === 0 ? (
        <View className='empty'>
          <Text className='empty-title'>暂无兑换记录</Text>
          <Text className='empty-sub'>去积分商城兑换专属权益</Text>
          <View className='go-mall-btn' onClick={() => Taro.redirectTo({ url: '/pages/points/mall' })}>
            <Text className='go-mall-text'>去商城 →</Text>
          </View>
        </View>
      ) : (
        <ScrollView scrollY className='orders-scroll'>
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending
            return (
              <View key={order.id} className='order-card'>
                <View className='order-top'>
                  <Text className='order-product'>{order.product?.name || '商品'}</Text>
                  <View className={`order-status ${statusInfo.cls}`}>
                    <Text className='order-status-text'>{statusInfo.label}</Text>
                  </View>
                </View>
                <View className='order-bottom'>
                  <Text className='order-cost'>消耗 {order.points_spent} 积分</Text>
                  <Text className='order-date'>{formatDate(order.created_at)}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
