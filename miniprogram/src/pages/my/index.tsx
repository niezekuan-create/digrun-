import { View, Text, Image } from '@tarojs/components'
import { useDidShow, useLoad, useReachBottom } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import {
  request,
  userManager,
  CLUB_ID_CONFIG,
  normalizeImageUrl,
  cleanText,
  toMs,
  toNumberOrNull,
  redirectToLogin,
  handleRequestError,
} from '../../utils/request'
import { getUserInfo, logout, setUserInfo } from '../../utils/auth'
import './index.scss'
import BottomNav from '../../components/BottomNav/index'

declare const FORCE_ADMIN: boolean

interface ApiRes<T> {
  data: T
  err: boolean
  msg?: string
}

interface MiniUserProfile {
  joinedCount: number
  checkedCount: number
  isAdmin: boolean
  isMember: boolean
  points: number
  user: {
    id: string
    username: string
    vipValidity?: number
  }
}

interface MyActivity {
  id: string
  name: string
  subtitle?: string
  timeStr?: string
  applyText?: string
  appliable?: boolean
  points?: number
  address?: string
  city?: string
  province?: string
  posterUrl?: string
  start?: number
  displayStatus?: string
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

interface ClubLeaderboardRow {
  rank: number
  username: string
  avatar?: string
  point: number
}

type MyTabKey = 'events' | 'orders' | 'leaderboard'

type LeaderboardApiItem = {
  avatar?: string
  username: string
  point: number | string
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  completed: '已完成',
  cancelled: '已取消',
}

const TAB_LABELS: Record<MyTabKey, string> = {
  events: '我的活动',
  orders: '兑换记录',
  leaderboard: '积分排行榜',
}

const TAB_KEYS: MyTabKey[] = ['events', 'orders', 'leaderboard']
const MEDALS = ['🥇', '🥈', '🥉']

const normalizeMyActivity = (value: any): MyActivity => ({
  id: String(value?.id || ''),
  name: cleanText(value?.name),
  subtitle: cleanText(value?.subtitle),
  timeStr: cleanText(value?.timeStr),
  applyText: cleanText(value?.applyText),
  appliable: !!value?.appliable,
  points: toNumberOrNull(value?.points) ?? 0,
  address: cleanText(value?.address),
  city: cleanText(value?.city),
  province: cleanText(value?.province),
  posterUrl: cleanText(value?.posterUrl),
  start: toMs(value?.start),
  displayStatus: cleanText(value?.displayStatus ?? value?.display_status).toLowerCase(),
})

const normalizeLeaderboardRows = (list: LeaderboardApiItem[], startRank: number): ClubLeaderboardRow[] =>
  list.map((item, index) => ({
    rank: startRank + index + 1,
    username: cleanText(item?.username),
    avatar: cleanText(item?.avatar) || undefined,
    point: toNumberOrNull(item?.point) ?? 0,
  }))

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const getActivityStatusInfo = (activity: MyActivity) => {
  const applyText = cleanText(activity.applyText)
  const isClosed = applyText.includes('已截止') || activity.appliable === false
  return isClosed
    ? { label: applyText || '已截止', cls: 'status-cancel' }
    : { label: applyText || '报名中', cls: 'status-open' }
}

const getActivityLocationText = (activity: MyActivity) =>
  cleanText(activity.address) || cleanText(activity.city) || cleanText(activity.province)

const getActivityDateText = (activity: MyActivity) => cleanText(activity.timeStr) || cleanText(activity.subtitle)

const PRE_START_CANCELABLE_STATUSES = new Set([
  'register_not_started',
  'register_open',
  'register_closed',
  'event_upcoming',
  'audit_pending',
  'waitlist',
  'registered',
])

const canCancelSignup = (activity: MyActivity) => {
  if (!activity.id) return false

  if (typeof activity.start === 'number') {
    return activity.start > Date.now()
  }

  return PRE_START_CANCELABLE_STATUSES.has(cleanText(activity.displayStatus).toLowerCase())
}

export default function MyPage() {
  const [myActivities, setMyActivities] = useState<MyActivity[]>([])
  const [actPage, setActPage] = useState<number>(0)
  const [actLoading, setActLoading] = useState<boolean>(false)
  const [actHasMore, setActHasMore] = useState<boolean>(true)
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [joinedCount, setJoinedCount] = useState<number>(0)
  const [checkedCount, setCheckedCount] = useState<number>(0)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [username, setUsername] = useState<string>('')
  const [orders, setOrders] = useState<PointsOrder[]>([])
  const [leaderboard, setLeaderboard] = useState<ClubLeaderboardRow[]>([])
  const [lbPage, setLbPage] = useState<number>(0)
  const [lbLoading, setLbLoading] = useState<boolean>(false)
  const [lbHasMore, setLbHasMore] = useState<boolean>(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [cancelingActivityId, setCancelingActivityId] = useState('')
  const [activeTab, setActiveTab] = useState<MyTabKey>('events')
  const [user, setUser] = useState(() => getUserInfo())
  const clubId = CLUB_ID_CONFIG
  const lastRefreshRef = useRef(0)

  useLoad(() => {
    setMyActivities([])
    setOrders([])
    setLeaderboard([])
    setMyPoints(null)
    setJoinedCount(0)
    setCheckedCount(0)
    setIsAdmin(false)
    setUsername('')
    setActPage(0)
    setActLoading(false)
    setActHasMore(true)
    setLbPage(0)
    setLbLoading(false)
    setLbHasMore(true)
  })

  useDidShow(() => {
    setUser(getUserInfo())
    const now = Date.now()
    if (lastRefreshRef.current && now - lastRefreshRef.current < 30000) return
    lastRefreshRef.current = now
    loadAll()
    if (myActivities.length === 0) loadActivities(0)
  })

  const loadActivities = async (page: number) => {
    if (actLoading) return
    setActLoading(true)
    try {
      if (!userManager.hasToken()) {
        redirectToLogin()
        return
      }
      const res = await request<ApiRes<MyActivity[]>>({
        url: `/api/mini/user/activities/list?clubId=${clubId}&page=${page}`,
      })
      if (res?.err) throw new Error(res?.msg || 'activities_failed')
      const list = Array.isArray(res?.data) ? res.data : []
      const next = list.map(normalizeMyActivity)
      setMyActivities((prev) => (page === 0 ? next : [...prev, ...next]))
      setActPage(page)
      setActHasMore(list.length > 0)
    } catch (e: any) {
      handleRequestError(e, '获取活动列表失败')
      setActHasMore(false)
    } finally {
      setActLoading(false)
    }
  }

  const loadLeaderboard = async (page: number) => {
    if (lbLoading) return
    setLbLoading(true)
    try {
      if (!userManager.hasToken()) {
        redirectToLogin()
        return
      }
      const res = await request<ApiRes<LeaderboardApiItem[]>>({
        url: `/api/mini/club/leaderboard?clubId=${clubId}&page=${page}`,
      })
      if (res?.err) throw new Error(res?.msg || 'leaderboard_failed')
      const list = Array.isArray(res?.data) ? res.data : []
      setLeaderboard((prev) => {
        const start = page === 0 ? 0 : prev.length
        const nextRows = normalizeLeaderboardRows(list, start)
        return page === 0 ? nextRows : [...prev, ...nextRows]
      })
      setLbPage(page)
      setLbHasMore(list.length > 0)
    } catch (e: any) {
      handleRequestError(e, '获取排行榜失败')
      setLbHasMore(false)
    } finally {
      setLbLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'events' && myActivities.length === 0) {
      loadActivities(0)
    }
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      loadLeaderboard(0)
    }
  }, [activeTab])

  useReachBottom(() => {
    if (activeTab === 'events') {
      if (actLoading || !actHasMore) return
      loadActivities(actPage + 1)
      return
    }
    if (activeTab === 'leaderboard') {
      if (lbLoading || !lbHasMore) return
      loadLeaderboard(lbPage + 1)
    }
  })

  const loadAll = async () => {
    if (!userManager.hasToken()) {
      redirectToLogin()
      return
    }

    try {
      const res = await request<ApiRes<MiniUserProfile>>({ url: `/api/mini/user/info?clubId=${clubId}` })
      if (res?.err) throw new Error(res?.msg || 'user_info_failed')
      const data = res?.data
      setMyPoints(toNumberOrNull(data?.points))
      setJoinedCount(toNumberOrNull(data?.joinedCount) ?? 0)
      setCheckedCount(toNumberOrNull(data?.checkedCount) ?? 0)
      setIsAdmin(!!data?.isAdmin)
      const nextName = data?.user?.username || ''
      setUsername(nextName)
      if (data?.user?.id) {
        const nextUser = {
          id: data.user.id,
          nickname: nextName,
          username: nextName,
          avatar: (data.user as any)?.avatar || '',
          is_admin: !!data?.isAdmin,
        }
        setUserInfo(nextUser as any)
        setUser(nextUser as any)
      }
    } catch (e: any) {
      handleRequestError(e, '获取用户信息失败')
    }
  }

  const goEventDetail = (eventId: number | string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${eventId}` })
  }

  const checkinCount = checkedCount
  const activeCount = joinedCount

  const goAdmin = () => Taro.navigateTo({ url: '/pages/admin/index' })

  const handleCancelSignup = async (activity: MyActivity) => {
    if (!canCancelSignup(activity)) return
    if (!userManager.hasToken()) {
      redirectToLogin()
      return
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: '取消报名',
        content: `确认取消「${activity.name || '该活动'}」的报名吗？`,
        confirmText: '确认取消',
        confirmColor: '#ef4444',
        cancelText: '再想想',
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      })
    })

    if (!confirmed) return

    setCancelingActivityId(activity.id)
    try {
      const res: any = await request({
        url: `/api/mini/activities/cancel/${activity.id}`,
        method: 'POST',
      })
      if (res?.err) throw new Error(res?.msg || res?.message || 'cancel_signup_failed')

      Taro.showToast({ title: '已取消报名', icon: 'success' })
      setMyActivities((prev) => prev.filter((item) => item.id !== activity.id))
      setJoinedCount((prev) => Math.max(0, prev - 1))
      loadActivities(0)
      loadAll()
    } catch (e: any) {
      handleRequestError(e, '取消报名失败')
    } finally {
      setCancelingActivityId('')
    }
  }

  const handleScanVerify = async () => {
    if (scanLoading) return
    if (!userManager.hasToken()) {
      redirectToLogin()
      return
    }
    setScanLoading(true)
    try {
      const scanRes = await new Promise<Taro.scanCode.SuccessCallbackResult>((resolve, reject) => {
        Taro.scanCode({ onlyFromCamera: true, scanType: ['qrCode'], success: resolve, fail: reject })
      })
      const raw = String((scanRes as any)?.result || '').trim()
      if (!raw) {
        Taro.showToast({ title: '未识别到内容', icon: 'none' })
        return
      }

      try {
        const res: any = await request<any>({
          url: `/api/club/${clubId}/activity/scan`,
          method: 'POST',
          data: { qrcode: raw },
        })
        if (res?.err) throw new Error(res?.msg || res?.message || 'verify_failed')
        Taro.showToast({ title: res?.msg || res?.message || '核销成功', icon: 'success' })
      } catch (e: any) {
        const msg = String(e?.message || '')
        if (msg.includes('Unauthorized')) throw e
        Taro.showModal({
          title: '扫码结果',
          content: raw,
          confirmText: '复制',
          cancelText: '关闭',
          success: (r) => {
            if (r.confirm) Taro.setClipboardData({ data: raw })
          },
        })
      }
    } catch (e: any) {
      const errMsg = String(e?.errMsg || e?.message || '')
      if (!errMsg.includes('cancel')) {
        Taro.showToast({ title: '扫码失败', icon: 'none' })
      }
    } finally {
      setScanLoading(false)
    }
  }

  const hasToken = userManager.hasToken()
  const displayName = (user as any)?.nickname || (user as any)?.username || username || '跑者'
  const showAdmin = !!FORCE_ADMIN || isAdmin || !!user?.is_admin

  return (
    <View className='my-page'>
      {/* ── 头部 ── */}
      <View className='profile-header'>
        <View className='avatar-wrap'>
          {user?.avatar ? (
            <Image src={normalizeImageUrl(user.avatar)} className='avatar' lazyLoad />
          ) : (
            <View className='avatar-placeholder'>
              <Text className='avatar-text'>{displayName?.[0] || 'R'}</Text>
            </View>
          )}
        </View>
        <View className='profile-info'>
          <Text className='profile-name'>{displayName}</Text>
          <View className='profile-stats'>
            <View className='stat-item'>
              <Text className='stat-num'>{activeCount}</Text>
              <Text className='stat-label'>活动</Text>
            </View>
            <View className='stat-divider' />
            <View className='stat-item'>
              <Text className='stat-num'>{checkinCount}</Text>
              <Text className='stat-label'>签到</Text>
            </View>
          </View>
        </View>
        <View className='header-actions'>
          {showAdmin && (
            <View className='admin-btn' onClick={goAdmin}>
              <Text className='admin-btn-text'>ADMIN</Text>
            </View>
          )}
          {showAdmin && (
            <View className={`scan-btn${scanLoading ? ' scan-btn-loading' : ''}`} onClick={handleScanVerify}>
              <Text className='scan-text'>{scanLoading ? '扫码中...' : '扫码核销'}</Text>
            </View>
          )}
          {hasToken ? (
            <View className='logout-btn' onClick={logout}>
              <Text className='logout-text'>退出</Text>
            </View>
          ) : (
            <View className='logout-btn' onClick={redirectToLogin}>
              <Text className='logout-text'>登录</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── 积分入口 ── */}
      <View className='points-entry'>
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
        {TAB_KEYS.map(tab => (
          <View
            key={tab}
            className={`my-tab${activeTab === tab ? ' my-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <Text className='my-tab-text'>{TAB_LABELS[tab]}</Text>
          </View>
        ))}
      </View>

      {/* ── Tab 内容区 ── */}
      {activeTab === 'events' && (
        <View className='regs-content'>
          {actLoading && myActivities.length === 0 ? (
            <View className='loading'>
              <Text className='loading-text'>LOADING...</Text>
            </View>
          ) : myActivities.length === 0 ? (
            <View className='empty'>
              <Text className='empty-text'>暂无报名记录</Text>
              <View className='go-events-btn' onClick={() => Taro.redirectTo({ url: '/pages/events/index' })}>
                <Text className='go-events-text'>去报名活动</Text>
              </View>
            </View>
          ) : (
            <View className='regs-list'>
              {myActivities.map((activity) => {
                const statusInfo = getActivityStatusInfo(activity)
                const locationText = getActivityLocationText(activity)
                const dateText = getActivityDateText(activity)
                const cover = normalizeImageUrl(activity.posterUrl)
                const canCancel = canCancelSignup(activity)
                const isCanceling = cancelingActivityId === activity.id
                return (
                  <View key={activity.id} className='reg-card'>
                    <View className='reg-card-top' onClick={() => goEventDetail(activity.id)}>
                      <View className='reg-cover-wrap'>
                        {cover ? (
                          <Image src={cover} className='reg-cover-img' mode='aspectFill' lazyLoad />
                        ) : (
                          <View className='reg-cover-placeholder' />
                        )}
                      </View>
                      <View className='reg-event-info'>
                        <Text className='reg-event-title'>{activity.name || '活动'}</Text>
                        <Text className='reg-event-date'>{dateText}</Text>
                        <Text className='reg-event-loc'>📍 {locationText}</Text>
                      </View>
                      <View className={`reg-status ${statusInfo.cls}`}>
                        <Text className='reg-status-text'>{statusInfo.label}</Text>
                      </View>
                    </View>

                    <View className='reg-meta'>
                      {typeof activity.points === 'number' && activity.points > 0 && (
                        <Text className='reg-tag'>积分 {activity.points}</Text>
                      )}
                    </View>

                    <View className='reg-actions'>
                      <View className='reg-action' onClick={() => goEventDetail(activity.id)}>
                        <Text className='reg-action-text'>查看详情 →</Text>
                      </View>
                      {canCancel && (
                        <View
                          className={`reg-action reg-action-danger${isCanceling ? ' reg-action-disabled' : ''}`}
                          onClick={isCanceling ? undefined : () => handleCancelSignup(activity)}
                        >
                          <Text className='reg-action-text reg-action-text-danger'>
                            {isCanceling ? '取消中...' : '取消报名'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })}
              <View className='section-empty'>
                <Text className='empty-text'>
                  {actLoading ? '加载中...' : actHasMore ? '上拉加载更多' : '没有更多了'}
                </Text>
              </View>
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
                      <Image src={normalizeImageUrl(order.product.image)} className='order-img' mode='aspectFill' lazyLoad />
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
              <Text className='empty-text'>{lbLoading ? 'LOADING...' : '暂无数据'}</Text>
            </View>
          ) : (
            <View className='lb-list'>
              {leaderboard.map(entry => {
                const meName = displayName === '跑者' ? '' : displayName
                const isMe = !!meName && entry.username === meName
                return (
                  <View key={`${entry.rank}-${entry.username}`} className={`lb-row${isMe ? ' lb-row-me' : ''}`}>
                    <Text className='lb-rank'>
                      {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                    </Text>
                    <View className='lb-avatar-wrap'>
                      {entry.avatar ? (
                        <Image src={normalizeImageUrl(entry.avatar)} className='lb-avatar' mode='aspectFill' lazyLoad />
                      ) : (
                        <View className='lb-avatar-placeholder'>
                          <Text className='lb-avatar-text'>{entry.username?.[0] || '?'}</Text>
                        </View>
                      )}
                    </View>
                    <Text className='lb-name'>{isMe ? `${entry.username} (我)` : entry.username}</Text>
                    <Text className='lb-count'>{entry.point} 分</Text>
                  </View>
                )
              })}
              <View className='section-empty'>
                <Text className='empty-text'>{lbLoading ? '加载中...' : lbHasMore ? '上拉加载更多' : '没有更多了'}</Text>
              </View>
            </View>
          )}
        </View>
      )}
      <BottomNav current='my' />
    </View>
  )
}
