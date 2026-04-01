import { View, Text, Image } from '@tarojs/components'
import { useDidShow, useLoad, useReachBottom } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { request, BASE_URL, userManager, CLUB_ID_CONFIG } from '../../utils/request'
import { getUserInfo, logout, setUserInfo } from '../../utils/auth'
import './index.scss'
import BottomNav from '../../components/BottomNav/index'
declare const IMG_VERSION: string

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

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:   '待处理',
  completed: '已完成',
  cancelled: '已取消',
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
  const [activeTab, setActiveTab] = useState<'events' | 'orders' | 'leaderboard'>('events')
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

  const cleanText = (v: any) => String(v || '').trim().replace(/^`|`$/g, '').trim()
  const normalizeUrl = (v: any) => {
    const u = cleanText(v)
    if (!u) return ''
    const withParam = (raw: string, key: string, value: string) => {
      const re = new RegExp(`([?&])${key}=`)
      if (re.test(raw)) return raw
      return `${raw}${raw.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`
    }
    const abs = /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u}`
    const isOss = /(\.oss-|\.aliyuncs\.com)/i.test(abs)
    if (isOss && !/[?&]x-oss-process=/i.test(abs)) {
      const next = `${abs}${abs.includes('?') ? '&' : '?'}x-oss-process=image%2Fformat%2Cjpg`
      return withParam(next, 'v', IMG_VERSION || '1')
    }
    if (/\.(heic|heif)(\?|#|$)/i.test(abs) && !/[?&]x-oss-process=/i.test(abs)) {
      const next = `${abs}${abs.includes('?') ? '&' : '?'}x-oss-process=image%2Fformat%2Cjpg`
      return withParam(next, 'v', IMG_VERSION || '1')
    }
    return abs
  }

  const loadActivities = async (page: number) => {
    if (actLoading) return
    setActLoading(true)
    try {
      if (!userManager.hasToken()) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      const res = await request<ApiRes<MyActivity[]>>({
        url: `/api/mini/user/activities/list?clubId=${clubId}&page=${page}`,
      })
      if (res?.err) throw new Error(res?.msg || 'activities_failed')
      const list = Array.isArray(res?.data) ? res.data : []
      const next = list.map((it) => ({
        id: String((it as any)?.id || ''),
        name: cleanText((it as any)?.name),
        subtitle: cleanText((it as any)?.subtitle),
        timeStr: cleanText((it as any)?.timeStr),
        applyText: cleanText((it as any)?.applyText),
        appliable: !!(it as any)?.appliable,
        points: typeof (it as any)?.points === 'number' ? (it as any).points : Number((it as any)?.points || 0),
        address: cleanText((it as any)?.address),
        city: cleanText((it as any)?.city),
        province: cleanText((it as any)?.province),
        posterUrl: cleanText((it as any)?.posterUrl),
      }))
      setMyActivities((prev) => (page === 0 ? next : [...prev, ...next]))
      setActPage(page)
      setActHasMore(list.length > 0)
    } catch (e: any) {
      const msg = String(e?.message || e || '')
      if (msg.includes('Unauthorized')) {
        Taro.showToast({ title: '请重新登录', icon: 'none' })
        setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 600)
      } else {
        Taro.showToast({ title: '获取活动列表失败', icon: 'none' })
      }
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
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      const res = await request<ApiRes<Array<{ avatar?: string; username: string; point: number | string }>>>({
        url: `/api/mini/club/leaderboard?clubId=${clubId}&page=${page}`,
      })
      if (res?.err) throw new Error(res?.msg || 'leaderboard_failed')
      const list = Array.isArray(res?.data) ? res.data : []
      setLeaderboard((prev) => {
        const start = page === 0 ? 0 : prev.length
        const nextRows: ClubLeaderboardRow[] = list.map((it, idx) => ({
          rank: start + idx + 1,
          username: cleanText(it?.username),
          avatar: cleanText(it?.avatar) || undefined,
          point: typeof it?.point === 'number' ? it.point : Number(it?.point || 0),
        }))
        return page === 0 ? nextRows : [...prev, ...nextRows]
      })
      setLbPage(page)
      setLbHasMore(list.length > 0)
    } catch (e: any) {
      const msg = String(e?.message || e || '')
      if (msg.includes('Unauthorized')) {
        Taro.showToast({ title: '请重新登录', icon: 'none' })
        setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 600)
      } else {
        Taro.showToast({ title: '获取排行榜失败', icon: 'none' })
      }
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
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }

    try {
      const toNumberOrNull = (v: any): number | null => {
        if (typeof v === 'number' && Number.isFinite(v)) return v
        if (typeof v === 'string') {
          const n = Number(v)
          return Number.isFinite(n) ? n : null
        }
        return null
      }

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
      const msg = String(e?.message || e || '')
      if (msg.includes('Unauthorized')) {
        Taro.showToast({ title: '请重新登录', icon: 'none' })
        setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 600)
      } else {
        Taro.showToast({ title: '获取用户信息失败', icon: 'none' })
      }
    }
  }

  const goEventDetail = (eventId: number | string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${eventId}` })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const checkinCount = checkedCount
  const activeCount = joinedCount

  const goAdmin = () => Taro.navigateTo({ url: '/pages/admin/index' })

  const handleScanVerify = async () => {
    if (scanLoading) return
    if (!userManager.hasToken()) {
      Taro.redirectTo({ url: '/pages/login/index' })
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

  const MEDALS = ['🥇', '🥈', '🥉']
  const hasToken = userManager.hasToken()
  const displayName = (user as any)?.nickname || (user as any)?.username || username || '跑者'
  const showAdmin = !!FORCE_ADMIN || isAdmin || !!user?.is_admin

  return (
    <View className='my-page'>
      {/* ── 头部 ── */}
      <View className='profile-header'>
        <View className='avatar-wrap'>
          {user?.avatar ? (
            <Image src={normalizeUrl(user.avatar)} className='avatar' lazyLoad />
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
            <View className='logout-btn' onClick={() => Taro.redirectTo({ url: '/pages/login/index' })}>
              <Text className='logout-text'>登录</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── 积分入口 ── */}
      <View
        className='points-entry'
        onClick={() => {
          if (!hasToken) {
            Taro.redirectTo({ url: '/pages/login/index' })
            return
          }
          Taro.navigateTo({ url: '/pages/points/my' })
        }}
      >
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
                const applyText = cleanText(activity.applyText)
                const isClosed = applyText.includes('已截止') || activity.appliable === false
                const statusInfo = isClosed
                  ? { label: applyText || '已截止', cls: 'status-cancel' }
                  : { label: applyText || '报名中', cls: 'status-open' }
                const locationText = cleanText(activity.address) || cleanText(activity.city) || cleanText(activity.province)
                const dateText = cleanText(activity.timeStr) || cleanText(activity.subtitle)
                const cover = normalizeUrl(activity.posterUrl)
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
                      <Image src={`${BASE_URL}${order.product.image}`} className='order-img' mode='aspectFill' lazyLoad />
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
                        <Image src={entry.avatar} className='lb-avatar' mode='aspectFill' lazyLoad />
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
