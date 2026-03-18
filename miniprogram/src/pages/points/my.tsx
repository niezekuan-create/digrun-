import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import './my.scss'

interface UserPoints {
  points_balance: number
  points_total: number
  updated_at: string
}

interface Transaction {
  id: number
  points_change: number
  source: string
  description: string
  created_at: string
}

const SOURCE_LABEL: Record<string, string> = {
  event_checkin: '活动签到',
  mall_exchange: '积分兑换',
}

export default function MyPointsPage() {
  const [points, setPoints] = useState<UserPoints | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    loadAll()
  })

  const loadAll = async () => {
    try {
      const [pts, txns] = await Promise.all([
        request<UserPoints>({ url: '/points/my' }),
        request<Transaction[]>({ url: '/points/transactions' }),
      ])
      setPoints(pts)
      setTransactions(txns)
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
    <View className='my-points-page'>
      <View className='points-header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-text'>← 返回</Text>
        </View>
        <Text className='page-title'>我的积分</Text>
      </View>

      {loading ? (
        <View className='loading'><Text className='loading-text'>LOADING...</Text></View>
      ) : (
        <ScrollView scrollY className='points-scroll'>
          <View className='balance-card'>
            <Text className='balance-label'>当前积分</Text>
            <Text className='balance-num'>{points?.points_balance ?? 0}</Text>
            <View className='balance-row'>
              <Text className='total-label'>累计获得</Text>
              <Text className='total-num'>{points?.points_total ?? 0} 积分</Text>
            </View>
            <View className='balance-actions'>
              <View className='action-btn' onClick={() => Taro.navigateTo({ url: '/pages/points/mall' })}>
                <Text className='action-btn-text'>去商城兑换 →</Text>
              </View>
              <View className='action-btn secondary' onClick={() => Taro.navigateTo({ url: '/pages/points/orders' })}>
                <Text className='action-btn-text secondary-text'>兑换记录 →</Text>
              </View>
            </View>
          </View>

          <View className='txn-section'>
            <Text className='txn-title'>积分记录</Text>
            {transactions.length === 0 ? (
              <View className='empty'>
                <Text className='empty-text'>暂无积分记录</Text>
                <Text className='empty-sub'>参加活动签到即可获得积分</Text>
              </View>
            ) : (
              transactions.map((txn) => (
                <View key={txn.id} className='txn-item'>
                  <View className='txn-left'>
                    <Text className='txn-source'>{SOURCE_LABEL[txn.source] || txn.source}</Text>
                    <Text className='txn-desc'>{txn.description}</Text>
                    <Text className='txn-date'>{formatDate(txn.created_at)}</Text>
                  </View>
                  <Text className={`txn-change ${txn.points_change > 0 ? 'positive' : 'negative'}`}>
                    {txn.points_change > 0 ? '+' : ''}{txn.points_change}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <BottomNav current='mall' />
    </View>
  )
}
