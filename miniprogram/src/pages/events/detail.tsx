import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import { getMockActivityDetail } from '../../utils/mockData'
import { isLoggedIn, getUserInfo } from '../../utils/auth'
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
  isSignedUp?: boolean
  isChecked?: boolean
  registrationId?: number
  requireSize?: boolean
  requireXhs?: boolean
}

export default function EventDetailPage() {
  const router = useRouter()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [topPadding, setTopPadding] = useState(0)
  const [signupVisible, setSignupVisible] = useState(false)
  const [signupSubmitting, setSignupSubmitting] = useState(false)
  const [signupForm, setSignupForm] = useState({
    name: '',
    mobile: '',
    clothingSize: '',
    shoeSize: '',
    xhsLink: '',
  })

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
      const res = await request<{ data: ActivityDetail; err: boolean }>({ url: `/api/mini/activities/detail/${id}` })
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

  const openSignupModal = () => {
    const user = getUserInfo()
    setSignupForm((prev) => ({
      ...prev,
      mobile: prev.mobile || user?.phone || '',
    }))
    setSignupVisible(true)
  }

  const closeSignupModal = () => {
    if (signupSubmitting) return
    setSignupVisible(false)
  }

  const updateSignupField = (key: keyof typeof signupForm, val: string) => {
    setSignupForm((prev) => ({ ...prev, [key]: val }))
  }

  const submitSignup = async () => {
    if (!activity?.id) return
    if (!isLoggedIn()) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 600)
      return
    }

    const name = signupForm.name.trim()
    const mobile = signupForm.mobile.trim()
    const clothingSize = signupForm.clothingSize.trim()
    const shoeSize = signupForm.shoeSize.trim()
    const rawXhsLink = signupForm.xhsLink.trim()
    const xhsLink = rawXhsLink ? normalizeUrl(rawXhsLink) : ''
    const requireSize = !!activity.requireSize
    const requireXhs = !!activity.requireXhs

    if (!name) return Taro.showToast({ title: '请填写姓名', icon: 'none' })
    if (!/^1\d{10}$/.test(mobile)) return Taro.showToast({ title: '请填写正确手机号', icon: 'none' })
    if (requireSize && !clothingSize) return Taro.showToast({ title: '请填写衣服尺码', icon: 'none' })
    if (requireSize && !shoeSize) return Taro.showToast({ title: '请填写鞋码', icon: 'none' })
    if (requireXhs && !xhsLink) return Taro.showToast({ title: '请填写小红书链接', icon: 'none' })

    setSignupSubmitting(true)
    try {
      const payload: any = { name, mobile }
      if (clothingSize) payload.clothingSize = clothingSize
      if (shoeSize) payload.shoeSize = shoeSize
      if (xhsLink) payload.xhsLink = xhsLink

      const res: any = await request<any>({
        url: `/api/mini/activities/join/${activity.id}`,
        method: 'POST',
        data: payload,
      })
      if (res?.err) {
        Taro.showToast({ title: res?.msg || res?.message || '报名失败', icon: 'none' })
        return
      }
      Taro.showToast({ title: '报名成功', icon: 'success' })
      setSignupVisible(false)
      setActivity((prev) => (prev ? { ...prev, isSignedUp: true } : prev))
      loadData(activity.id)
    } catch (e) {
    } finally {
      setSignupSubmitting(false)
    }
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

  const toMs = (v: any): number | undefined => {
    const n = typeof v === 'string' ? Number(v) : v
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return undefined
    return n < 1e12 ? n * 1000 : n
  }

  const toDate = (v: any): Date | null => {
    const ms = toMs(v)
    if (!ms) return null
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const startDate = toDate(activity.start)
  const endDate = toDate(activity.end)
  const applyStartDate = toDate(activity.applyStart)
  const applyEndDate = toDate(activity.applyEnd)

  const timeRange = (() => {
    if (!startDate) return activity.timeStr || ''
    if (!endDate) return `${formatDateShort(startDate)} ${formatTime(startDate)}`
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()
    if (sameDay) return `${formatTime(startDate)} — ${formatTime(endDate)}`
    return `${formatDateShort(startDate)} ${formatTime(startDate)} — ${formatDateShort(endDate)} ${formatTime(endDate)}`
  })()

  const applyRange =
    applyStartDate && applyEndDate
      ? `${formatDate(applyStartDate)} ${formatTime(applyStartDate)} — ${formatDate(applyEndDate)} ${formatTime(applyEndDate)}`
      : ''

  const joinCount = activity.joinCount ?? 0
  const capacity = activity.count ?? 0
  const points = activity.points ?? 0

  const getCtaState = () => {
    const now = Date.now()
    const applyStart = toMs(activity.applyStart)
    const applyEnd = toMs(activity.applyEnd)
    const start = toMs(activity.start)
    const end = toMs(activity.end)
    const isSignedUp = !!activity.isSignedUp
    const isChecked = !!activity.isChecked

    if (end !== undefined && now > end) return { text: '已结束', enabled: false, action: 'none' as const }

    if (start !== undefined && end !== undefined && now >= start && now <= end) {
      if (isChecked) return { text: '已签到', enabled: false, action: 'none' as const }
      if (isSignedUp) return { text: '签到', enabled: true, action: 'checkin' as const }
      return { text: '未报名', enabled: false, action: 'none' as const }
    }

    if (applyStart !== undefined && now < applyStart) return { text: '未开始', enabled: false, action: 'none' as const }

    const inApplyWindow =
      applyStart !== undefined && applyEnd !== undefined ? now >= applyStart && now <= applyEnd : undefined

    if (inApplyWindow !== false) {
      if (isSignedUp) return { text: '已报名', enabled: false, action: 'none' as const }
      if (activity.appliable) return { text: '报名', enabled: true, action: 'signup' as const }
      return { text: activity.applyText || '已截止', enabled: false, action: 'none' as const }
    }

    if (isSignedUp) return { text: '已报名', enabled: false, action: 'none' as const }
    return { text: activity.applyText || '已截止', enabled: false, action: 'none' as const }
  }

  const ctaState = getCtaState()
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
                <Text className='time-block-range'>{timeRange || '—'}</Text>
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
          className={`bottom-cta${ctaState.enabled ? '' : ' disabled'}`}
          onClick={
            ctaState.enabled
              ? () => {
                  if (ctaState.action === 'signup') {
                    openSignupModal()
                    return
                  }
                  if (ctaState.action === 'checkin') {
                    Taro.navigateTo({ url: `/pages/checkin/index?activityId=${activity.id}` })
                  }
                }
              : undefined
          }
        >
          <Text className='bottom-cta-text'>{ctaState.text}</Text>
        </View>
      </View>

      {signupVisible && (
        <View className='signup-mask' onClick={closeSignupModal}>
          <View className='signup-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='signup-title'>填写报名信息</Text>

            <View className='signup-field'>
              <Text className='signup-label'>姓名</Text>
              <Input
                className='signup-input'
                value={signupForm.name}
                placeholder='请输入姓名'
                placeholderClass='signup-placeholder'
                onInput={(e) => updateSignupField('name', String(e.detail.value || ''))}
              />
            </View>

            <View className='signup-field'>
              <Text className='signup-label'>手机</Text>
              <Input
                className='signup-input'
                value={signupForm.mobile}
                placeholder='请输入手机号'
                placeholderClass='signup-placeholder'
                type='number'
                maxlength={11}
                onInput={(e) => updateSignupField('mobile', String(e.detail.value || ''))}
              />
            </View>

            <View className='signup-field'>
              <Text className='signup-label'>衣服尺码{activity.requireSize ? '（必填）' : '（选填）'}</Text>
              <Input
                className='signup-input'
                value={signupForm.clothingSize}
                placeholder='例如：S/M/L/XL'
                placeholderClass='signup-placeholder'
                onInput={(e) => updateSignupField('clothingSize', String(e.detail.value || ''))}
              />
            </View>

            <View className='signup-field'>
              <Text className='signup-label'>鞋码{activity.requireSize ? '（必填）' : '（选填）'}</Text>
              <Input
                className='signup-input'
                value={signupForm.shoeSize}
                placeholder='例如：39/40/41'
                placeholderClass='signup-placeholder'
                onInput={(e) => updateSignupField('shoeSize', String(e.detail.value || ''))}
              />
            </View>

            <View className='signup-field'>
              <Text className='signup-label'>小红书链接{activity.requireXhs ? '（必填）' : '（选填）'}</Text>
              <Input
                className='signup-input'
                value={signupForm.xhsLink}
                placeholder='https://xhslink.com/m/xxxx'
                placeholderClass='signup-placeholder'
                onInput={(e) => updateSignupField('xhsLink', String(e.detail.value || ''))}
              />
            </View>

            <View className='signup-actions'>
              <View className='signup-btn ghost' onClick={closeSignupModal}>
                <Text className='signup-btn-text'>取消</Text>
              </View>
              <View
                className={`signup-btn primary${signupSubmitting ? ' disabled' : ''}`}
                onClick={signupSubmitting ? undefined : submitSignup}
              >
                <Text className='signup-btn-text'>{signupSubmitting ? '提交中' : '报名'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
