import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import { getMockActivityDetail } from '../../utils/mockData'
import './detail.scss'

interface ActivityDetail {
  id: string
  club?: {
    id: string
    name: string
    avatar?: string
  }
  name: string
  subtitle?: string
  description?: string
  start?: number
  end?: number
  applyStart?: number
  applyEnd?: number
  posterUrl?: string
  address?: string
  route?: string
  count?: number
  joinCount?: number
  waitlistCount?: number
  maxWaitlist?: number
  points?: number
  joinAvatars?: string[]
  location?: {
    longitude: number | null
    latitude: number | null
  }
  appliable?: boolean
  applyText?: string
  timeStr?: string
  btnText?: string
  btnStatus?: boolean
}

export default function EventDetailPage() {
  const router = useRouter()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [topPadding, setTopPadding] = useState(0)

  const activityId = router.params.activityId || router.params.id

  useLoad(() => {
    try {
      const sys = Taro.getSystemInfoSync()
      const menu = Taro.getMenuButtonBoundingClientRect?.()
      const base = Math.max(sys?.statusBarHeight || 0, menu?.top || 0)
      setTopPadding(base ? base + 8 : 44)
    } catch (e) {
      setTopPadding(44)
    }
    if (!activityId) return
    loadData(String(activityId))
  })

  const loadData = async (id: string) => {
    try {
      const res = await request<{ data: ActivityDetail }>({ url: `/activities/detail/${id}`, auth: false })
      setActivity(res?.data || null)
    } catch (e) {
      const mock = getMockActivityDetail(id)
      if (mock) setActivity(mock.data as ActivityDetail)
    } finally {
      setLoading(false)
    }
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    return url.trim().replace(/^`+|`+$/g, '')
  }

  const openRoute = async () => {
    const url = normalizeUrl(activity?.route)
    if (!url) return
    try {
      await Taro.setClipboardData({ data: url })
      Taro.showToast({ title: '链接已复制', icon: 'none' })
    } catch (e) {
      Taro.showToast({ title: '复制失败', icon: 'none' })
    }
  }

  const formatDate = (date: Date) =>
    `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`

  const formatTime = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  const formatDateShort = (date: Date) =>
    `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

  if (loading) {
    return (
      <View className='detail-loading'>
        <Text className='detail-loading-text'>LOADING...</Text>
      </View>
    )
  }

  if (!activity) {
    return (
      <View className='detail-loading'>
        <Text className='detail-loading-text'>活动不存在</Text>
      </View>
    )
  }

  const startDate = activity.start ? new Date(activity.start) : null
  const endDate = activity.end ? new Date(activity.end) : null
  const applyStartDate = activity.applyStart ? new Date(activity.applyStart) : null
  const applyEndDate = activity.applyEnd ? new Date(activity.applyEnd) : null

  const timeRange = startDate
    ? `${formatDate(startDate)} ${formatTime(startDate)}${endDate ? ` — ${formatTime(endDate)}` : ''}`
    : activity.timeStr || ''

  const applyRange =
    applyStartDate && applyEndDate
      ? `${formatDate(applyStartDate)} ${formatTime(applyStartDate)} — ${formatDate(applyEndDate)} ${formatTime(applyEndDate)}`
      : ''

  const joinCount = activity.joinCount ?? 0
  const capacity = activity.count ?? 0
  const points = activity.points ?? 0
  const ctaText = activity.btnText || (activity.appliable ? '立即报名' : activity.applyText || '已截止')
  const ctaEnabled = !!activity.btnStatus
  const clubAvatar = normalizeUrl(activity.club?.avatar)
  const clubName = activity.club?.name || 'DIG RUNNING CLUB'
  const avatars = (activity.joinAvatars || []).map(normalizeUrl).filter(Boolean).slice(0, 8)

  return (
    <View className='detail-page'>
      {/* Topbar */}
      <View className='detail-topbar' style={{ paddingTop: `${topPadding}px` }}>
        <View className='topbar-back' onClick={() => Taro.navigateBack()}>
          <Text className='topbar-back-icon'>←</Text>
        </View>
      </View>

      <ScrollView scrollY className='detail-scroll'>
        {/* Header */}
        <View className='detail-header'>
          <View className='detail-club-row'>
            {clubAvatar ? (
              <Image src={clubAvatar} className='detail-club-avatar' mode='aspectFill' />
            ) : (
              <View className='detail-club-avatar-placeholder'>
                <Text className='detail-club-avatar-char'>D</Text>
              </View>
            )}
            <Text className='detail-club-name'>{clubName}</Text>
          </View>

          <Text className='detail-title'>{activity.name}</Text>
          {activity.subtitle && <Text className='detail-subtitle'>{activity.subtitle}</Text>}

          {/* Time block */}
          <View className='detail-time-block'>
            {startDate ? (
              <>
                <View className='time-block-top'>
                  <Text className='time-block-date'>{formatDateShort(startDate)}</Text>
                  <Text className='time-block-year'>{startDate.getFullYear()}</Text>
                </View>
                <Text className='time-block-range'>
                  {formatTime(startDate)}{endDate ? ` — ${formatTime(endDate)}` : ''}
                </Text>
              </>
            ) : (
              <Text className='time-block-range'>{activity.timeStr || '—'}</Text>
            )}
          </View>

          {activity.address ? (
            <View className='detail-site-row'>
              <Text className='detail-site-label'>SITE</Text>
              <Text className='detail-site-val'>{activity.address}</Text>
            </View>
          ) : null}
        </View>

        <View className='detail-sep' />

        {/* Description */}
        {activity.description ? (
          <View className='detail-section'>
            <Text className='section-label'>活动描述</Text>
            <Text className='section-body'>{activity.description}</Text>
          </View>
        ) : null}

        {/* Apply time */}
        <View className='detail-section'>
          <Text className='section-label'>报名时间</Text>
          <Text className='section-body'>{applyRange || activity.applyText || '—'}</Text>
        </View>

        {/* Participants */}
        <View className='detail-section'>
          <Text className='section-label'>参与人数</Text>
          <Text className='section-body'>
            {capacity ? `${joinCount} / ${capacity} 人` : `${joinCount} 人`}
          </Text>
          {avatars.length > 0 && (
            <View className='avatar-row'>
              {avatars.map((a, idx) => (
                <Image key={`${a}_${idx}`} src={a} className='reg-avatar' mode='aspectFill' />
              ))}
              {activity.joinCount && activity.joinCount > avatars.length ? (
                <View className='reg-avatar reg-avatar-more'>
                  <Text className='reg-avatar-more-text'>…</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Points */}
        {points > 0 && (
          <View className='detail-section'>
            <Text className='section-label'>活动积分</Text>
            <View className='points-row'>
              <Text className='points-num'>{points}</Text>
              <Text className='points-unit'>分</Text>
            </View>
            <Text className='points-hint'>完成活动可获得</Text>
          </View>
        )}

        {/* Route */}
        {activity.route ? (
          <View className='detail-section detail-section-tap' onClick={openRoute}>
            <Text className='section-label'>活动路线</Text>
            <Text className='section-body route-val'>{activity.address || '查看路线'}</Text>
            <Text className='route-hint'>点击复制链接 →</Text>
          </View>
        ) : null}

        <View className='detail-footer-spacer' />
      </ScrollView>

      {/* Bottom CTA */}
      <View className='detail-bottombar'>
        <View
          className={`bottom-cta${ctaEnabled ? '' : ' disabled'}`}
          onClick={ctaEnabled ? () => Taro.navigateTo({ url: `/pages/register/index?id=${activity.id}` }) : undefined}
        >
          <Text className='bottom-cta-text'>{ctaText}</Text>
        </View>
      </View>
    </View>
  )
}
