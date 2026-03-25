import { View, Text, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request, BASE_URL, userManager } from '../../utils/request'
import { getUserInfo, logout, setUserInfo } from '../../utils/auth'
import './index.scss'

interface ApiRes<T> {
  data: T
  err: boolean
  msg?: string
}

interface Registration {
  id: number
  status: string
  pace?: string
  distance?: string
  bag_storage?: boolean
  coffee?: boolean
  checkin_time?: string
  created_at: string
  event?: {
    id: number
    title: string
    date: string
    location: string
    route: string
    cover_image?: string
  }
}

interface PointsOrder {
  id: number
  points_spent: number
  status: 'pending' | 'completed' | 'cancelled'
  size?: string
  delivery_type: 'shipping' | 'pickup'
  created_at: string
  product: {
    id: number
    name: string
    image?: string
  }
}

interface LeaderboardEntry {
  rank: number
  userId: number
  nickname: string
  avatar?: string
  points_balance: number
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: '审核中', cls: 'status-pending' },
  approved:   { label: '报名成功', cls: 'status-open' },
  checked_in: { label: '已签到', cls: 'status-checkin' },
  cancelled:  { label: '已取消', cls: 'status-cancel' },
  rejected:   { label: '已拒绝', cls: 'status-cancel' },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:   '待处理',
  completed: '已完成',
  cancelled: '已取消',
}

export default function MyPage() {
  const [regs, setRegs] = useState<Registration[]>([])
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [orders, setOrders] = useState<PointsOrder[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'orders' | 'leaderboard'>('events')
  const [user, setUser] = useState(() => getUserInfo())
  const clubId = 'xbc3mQnYPR'

  useLoad(() => {
    if (!userManager.hasToken()) {
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }
    loadAll()
  })

  const loadAll = async () => {
    try {
      const [pts, info] = await Promise.all([
        request<ApiRes<number>>({ url: `/club/${clubId}/point` }),
        request<ApiRes<any> | any>({ url: '/user/info' }),
      ])

      if (pts?.err) throw new Error('points_failed')
      setMyPoints(typeof pts?.data === 'number' ? pts.data : null)

      const userInfo = (info as any)?.err === false ? (info as any)?.data : (info as any)
      if (userInfo) {
        setUserInfo(userInfo)
        setUser(userInfo)
      }
    } catch (e) {
      if (!userManager.hasToken()) {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
    }

    // 我的报名记录
    request<Registration[]>({ url: '/registrations/my' })
      .then(setRegs)
      .catch(() => {})

    // 兑换记录
    request<PointsOrder[]>({ url: '/points/orders' })
      .then(setOrders)
      .catch(() => {})

    // 积分排行榜
    request<LeaderboardEntry[]>({ url: '/leaderboard/points', auth: false })
      .then(data => {
        setLeaderboard(data.slice(0, 20))
        const currentUserId = getUserInfo()?.id
        const me = currentUserId ? data.find(e => e.userId === currentUserId) : undefined
        setMyRank(me || null)
      })
      .catch(() => {})

    setLoading(false)
  }

  const goCheckin = (regId: number) => {
    Taro.navigateTo({ url: `/pages/checkin/index?id=${regId}` })
  }

  const goEventDetail = (eventId: number | string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${eventId}` })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const goAdmin = () => Taro.navigateTo({ url: '/pages/admin/index' })

  const handleCancel = (reg: Registration) => {
    Taro.showModal({
      title: '取消报名',
      content: `确认取消「${reg.event?.title}」的报名？`,
      confirmText: '取消报名',
      cancelText: '再想想',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/registrations/${reg.id}/cancel`, method: 'POST' })
          Taro.showToast({ title: '已取消报名', icon: 'success' })
          loadAll()
        } catch (e) {}
      },
    })
  }

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <View className='my-page'>
      {/* ── 头部 ── */}
      <View className='profile-header'>
        <View className='avatar-wrap'>
          {user?.avatar ? (
            <Image src={user.avatar} className='avatar' />
          ) : (
            <View className='avatar-placeholder'>
              <Text className='avatar-text'>{user?.nickname?.[0] || 'R'}</Text>
            </View>
          )}
        </View>
        <View className='profile-info'>
          <Text className='profile-name'>{user?.nickname || '跑者'}</Text>
        </View>
        <View className='header-actions'>
          {user?.is_admin && (
            <View className='admin-btn' onClick={goAdmin}>
              <Text className='admin-btn-text'>ADMIN</Text>
            </View>
          )}
          <View className='logout-btn' onClick={logout}>
            <Text className='logout-text'>退出</Text>
          </View>
        </View>
      </View>

      {/* ── 积分入口 ── */}
      <View className='points-entry' onClick={() => Taro.navigateTo({ url: '/pages/points/my' })}>
        <View className='points-entry-left'>
          <Text className='points-entry-icon'>◇</Text>
          <Text className='points-entry-label'>我的积分</Text>
        </View>
        <View className='points-entry-right'>
          <Text className='points-entry-num'>{myPoints ?? '--'}</Text>
          <Text className='points-entry-arrow'>→</Text>
        </View>
      </View>

      {/* ── Tab 横向入口 ── */}
      <View className='my-tabs'>
        {(['events', 'orders', 'leaderboard'] as const).map(tab => (
          <View
            key={tab}
            className={`my-tab${activeTab === tab ? ' my-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <Text className='my-tab-text'>
              {tab === 'events' ? '我的活动' : tab === 'orders' ? '兑换记录' : '积分排行榜'}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Tab 内容区 ── */}
      {activeTab === 'events' && (
        <View className='regs-content'>
          {loading ? (
            <View className='loading'>
              <Text className='loading-text'>LOADING...</Text>
            </View>
          ) : regs.length === 0 ? (
            <View className='empty'>
              <Text className='empty-text'>暂无报名记录</Text>
              <View className='go-events-btn' onClick={() => Taro.navigateTo({ url: '/pages/events/index' })}>
                <Text className='go-events-text'>去报名活动</Text>
              </View>
            </View>
          ) : (
            <View className='regs-list'>
              {regs.map((reg) => {
                const statusInfo = STATUS_MAP[reg.status] || STATUS_MAP.pending
                return (
                  <View key={reg.id} className='reg-card'>
                    <View className='reg-card-top' onClick={() => reg.event && goEventDetail(reg.event.id)}>
                      <View className='reg-cover-wrap'>
                        {reg.event?.cover_image ? (
                          <Image src={`${BASE_URL}${reg.event.cover_image}`} className='reg-cover-img' mode='aspectFill' />
                        ) : (
                          <View className='reg-cover-placeholder' />
                        )}
                      </View>
                      <View className='reg-event-info'>
                        <Text className='reg-event-title'>{reg.event?.title || '活动'}</Text>
                        <Text className='reg-event-date'>{reg.event ? formatDate(reg.event.date) : ''}</Text>
                        <Text className='reg-event-loc'>📍 {reg.event?.location}</Text>
                      </View>
                      <View className={`reg-status ${statusInfo.cls}`}>
                        <Text className='reg-status-text'>{statusInfo.label}</Text>
                      </View>
                    </View>

                    <View className='reg-meta'>
                      {reg.pace && <Text className='reg-tag'>{reg.pace}</Text>}
                      {reg.distance && <Text className='reg-tag'>{reg.distance}</Text>}
                      {reg.bag_storage && <Text className='reg-tag'>行李寄存</Text>}
                      {reg.coffee && <Text className='reg-tag'>咖啡</Text>}
                    </View>

                    {(reg.status === 'pending' || reg.status === 'approved') && (
                      <View className='reg-actions'>
                        {reg.status === 'approved' && (
                          <View className='reg-action' onClick={() => goCheckin(reg.id)}>
                            <Text className='reg-action-text'>查看签到二维码 →</Text>
                          </View>
                        )}
                        <View className='reg-cancel-btn' onClick={() => handleCancel(reg)}>
                          <Text className='reg-cancel-text'>取消报名</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      )}

      {activeTab === 'orders' && (
        <View className='tab-content'>
          {orders.length === 0 ? (
            <View className='section-empty'>
              <Text className='empty-text'>暂无兑换记录</Text>
            </View>
          ) : (
            <View className='orders-list'>
              {orders.map(order => (
                <View key={order.id} className='order-card'>
                  <View className='order-img-wrap'>
                    {order.product?.image ? (
                      <Image src={`${BASE_URL}${order.product.image}`} className='order-img' mode='aspectFill' />
                    ) : (
                      <View className='order-img-placeholder' />
                    )}
                  </View>
                  <View className='order-info'>
                    <Text className='order-name'>{order.product?.name}</Text>
                    {order.size && <Text className='order-meta'>尺码：{order.size}</Text>}
                    <Text className='order-meta'>{order.delivery_type === 'shipping' ? '邮寄' : '活动自提'}</Text>
                    <Text className='order-date'>{formatDate(order.created_at)}</Text>
                  </View>
                  <View className={`order-status order-status-${order.status}`}>
                    <Text className='order-status-text'>{ORDER_STATUS_LABEL[order.status] || order.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'leaderboard' && (
        <View className='tab-content'>
          {leaderboard.length === 0 ? (
            <View className='section-empty'>
              <Text className='empty-text'>暂无数据</Text>
            </View>
          ) : (
            <View className='lb-list'>
              {leaderboard.map(entry => {
                const isMe = entry.userId === user?.id
                return (
                  <View key={entry.userId} className={`lb-row${isMe ? ' lb-row-me' : ''}`}>
                    <Text className='lb-rank'>
                      {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                    </Text>
                    <View className='lb-avatar-wrap'>
                      {entry.avatar ? (
                        <Image src={entry.avatar} className='lb-avatar' mode='aspectFill' />
                      ) : (
                        <View className='lb-avatar-placeholder'>
                          <Text className='lb-avatar-text'>{entry.nickname?.[0] || '?'}</Text>
                        </View>
                      )}
                    </View>
                    <Text className='lb-name'>{isMe ? `${entry.nickname} (我)` : entry.nickname}</Text>
                    <Text className='lb-count'>{entry.points_balance} 分</Text>
                  </View>
                )
              })}
              {myRank && myRank.rank > 20 && (
                <View className='lb-my-rank-row'>
                  <Text className='lb-my-rank-label'>我的排名</Text>
                  <Text className='lb-my-rank-val'>#{myRank.rank} · {myRank.points_balance} 分</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <BottomNav current='my' />
    </View>
  )
}
