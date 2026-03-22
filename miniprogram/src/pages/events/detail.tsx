import { View, Text, ScrollView, Image, Canvas } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { request } from '../../utils/request'
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
  const [topbarPaddingTopPx, setTopbarPaddingTopPx] = useState<number>(0)
  const [bgGradient, setBgGradient] = useState<string>('')

  const activityId = router.params.activityId || router.params.id
  const colorCanvasId = 'activity_detail_color_canvas'

  useLoad(() => {
    if (!activityId) return
    loadData(String(activityId))
    try {
      const sys = Taro.getSystemInfoSync()
      const menu = Taro.getMenuButtonBoundingClientRect?.()
      const baseTop = Math.max(sys?.statusBarHeight || 0, menu?.top || 0)
      setTopbarPaddingTopPx(baseTop ? baseTop + 10 : 0)
    } catch (e) {}
  })

  const loadData = async (id: string) => {
    try {
      const res = await request<{ data: ActivityDetail }>({ url: `/activities/detail/${id}`, auth: false })
      setActivity(res?.data || null)
    } catch (e) {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    return url.trim().replace(/^`+|`+$/g, '')
  }

  const goBack = () => {
    Taro.navigateBack()
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

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }

  const formatTime = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const buildGradient = (rgb: { r: number; g: number; b: number }) => {
    const { r, g, b } = rgb
    return `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.78) 0%, rgba(${r}, ${g}, ${b}, 0.24) 44%, rgba(11, 11, 11, 1) 100%)`
  }

  const extractAverageColor = async (src: string) => {
    try {
      const imageInfo: any = await Taro.getImageInfo({ src })
      const path = imageInfo?.path || imageInfo?.tempFilePath || src
      const size = 30

      const ctx = Taro.createCanvasContext(colorCanvasId)
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(path, 0, 0, size, size)

      await new Promise<void>((resolve) => {
        ctx.draw(false, resolve)
      })

      const imageData: any = await Taro.canvasGetImageData({ canvasId: colorCanvasId, x: 0, y: 0, width: size, height: size })
      const data: Uint8ClampedArray = imageData?.data
      if (!data || data.length < 4) return null

      let r = 0
      let g = 0
      let b = 0
      let total = 0
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a < 10) continue
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        total += 1
      }
      if (!total) return null

      const rr = Math.max(0, Math.min(255, Math.round(r / total)))
      const gg = Math.max(0, Math.min(255, Math.round(g / total)))
      const bb = Math.max(0, Math.min(255, Math.round(b / total)))
      return { r: rr, g: gg, b: bb }
    } catch (e) {
      return null
    }
  }

  const posterUrl = normalizeUrl(activity?.posterUrl)

  useEffect(() => {
    let cancelled = false
    if (!posterUrl) {
      setBgGradient('')
      return () => {
        cancelled = true
      }
    }

    Taro.nextTick(async () => {
      const rgb = await extractAverageColor(posterUrl)
      if (cancelled) return
      if (rgb) setBgGradient(buildGradient(rgb))
    })

    return () => {
      cancelled = true
    }
  }, [posterUrl])

  if (loading) {
    return (
      <View className='activity-detail-loading'>
        <Text className='activity-detail-loading-text'>LOADING...</Text>
      </View>
    )
  }

  if (!activity) {
    return (
      <View className='activity-detail-loading'>
        <Text className='activity-detail-loading-text'>活动不存在</Text>
      </View>
    )
  }

  const startDate = activity.start ? new Date(activity.start) : null
  const endDate = activity.end ? new Date(activity.end) : null
  const applyStartDate = activity.applyStart ? new Date(activity.applyStart) : null
  const applyEndDate = activity.applyEnd ? new Date(activity.applyEnd) : null

  const timeRange = startDate
    ? `${formatDate(startDate)} ${formatTime(startDate)}${endDate ? ` - ${formatTime(endDate)}` : ''}`
    : activity.timeStr || ''
  const applyRange =
    applyStartDate && applyEndDate
      ? `${formatDate(applyStartDate)} ${formatTime(applyStartDate)} ~ ${formatDate(applyEndDate)} ${formatTime(applyEndDate)}`
      : ''

  const joinCount = activity.joinCount ?? 0
  const capacity = activity.count ?? 0
  const ctaText = activity.btnText || (activity.appliable ? '参与' : activity.applyText || '已截止')
  const ctaEnabled = !!activity.btnStatus && !!normalizeUrl(activity.route)
  const clubAvatar = normalizeUrl(activity.club?.avatar)
  const clubName = activity.club?.name || 'RUNNING'
  const avatars = (activity.joinAvatars || []).map(normalizeUrl).filter(Boolean).slice(0, 8)
  const points = activity.points ?? 0

  return (
    <View className='activity-detail-page'>
      <View className='activity-detail-dynamic-bg' style={bgGradient ? { backgroundImage: bgGradient } : undefined} />
      <View className='activity-detail-dynamic-bg-mask' />
      <Canvas canvasId={colorCanvasId} className='activity-detail-color-canvas' style={{ width: '30px', height: '30px' }} />

      <View className='activity-detail-topbar' style={topbarPaddingTopPx ? { paddingTop: `${topbarPaddingTopPx}px` } : undefined}>
        <View className='topbar-left' onClick={goBack}>
          <Text className='topbar-icon'>←</Text>
        </View>
        <View />
      </View>

      <ScrollView scrollY className='activity-detail-scroll'>
        <View className='activity-detail-cover'>
          {posterUrl ? (
            <Image src={posterUrl} className='activity-detail-cover-img' mode='aspectFill' />
          ) : (
            <View className='activity-detail-cover-img placeholder' />
          )}
          <View className='activity-detail-cover-mask' />
          <View className='activity-detail-cover-content'>
            {clubAvatar ? (
              <Image src={clubAvatar} className='activity-detail-club-avatar' mode='aspectFill' />
            ) : (
              <View className='activity-detail-club-avatar placeholder'>
                <Text className='activity-detail-club-avatar-text'>D</Text>
              </View>
            )}
            <View className='activity-detail-tag'>
              <Text className='activity-detail-tag-text'>{clubName}</Text>
            </View>

            <Text className='activity-detail-title'>{activity.name}</Text>
            <Text className='activity-detail-meta'>{activity.timeStr || timeRange}</Text>
            <Text className='activity-detail-meta'>{activity.address || ''}</Text>
          </View>
        </View>

        <View className='activity-detail-card'>
          <Text className='card-title'>活动描述</Text>
          <Text className='card-desc'>{activity.description || '—'}</Text>
        </View>

        <View className='activity-detail-card'>
          <Text className='card-title'>报名时间</Text>
          <Text className='card-desc'>{applyRange || activity.applyText || '—'}</Text>
        </View>

        <View className='activity-detail-card'>
          <Text className='card-title'>参与人数</Text>
          <Text className='card-desc'>{capacity ? `${joinCount}/${capacity}` : `${joinCount}`} 人</Text>
          {avatars.length > 0 ? (
            <View className='avatar-row'>
              {avatars.map((a, idx) => (
                <Image key={`${a}_${idx}`} src={a} className='avatar' mode='aspectFill' />
              ))}
              {activity.joinCount && activity.joinCount > avatars.length ? (
                <View className='avatar more'>
                  <Text className='avatar-more-text'>…</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View className='activity-detail-card'>
          <Text className='card-title'>活动积分</Text>
          <Text className='points-num'>{points}</Text>
          <Text className='points-hint'>完成活动可获得积分</Text>
        </View>

        <View className='activity-detail-card map-card' onClick={openRoute}>
          <View className='map-visual'>
            <View className='map-pin' />
          </View>
          <Text className='map-title'>{activity.address || '地图'}</Text>
          <Text className='map-sub'>点击复制活动链接</Text>
          <View className='map-btn'>
            <Text className='map-btn-text'>导航</Text>
          </View>
        </View>

        <View className='activity-detail-footer-spacer' />
      </ScrollView>

      <View className='activity-detail-bottombar'>
        {ctaEnabled ? (
          <View className='bottom-cta' onClick={openRoute}>
            <Text className='bottom-cta-text'>{ctaText}</Text>
          </View>
        ) : (
          <View className='bottom-cta disabled'>
            <Text className='bottom-cta-text'>{ctaText}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
