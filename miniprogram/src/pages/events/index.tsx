import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import { getMockActivitiesList } from '../../utils/mockData'
import './index.scss'

interface Activity {
  id: string
  name: string
  subtitle?: string
  posterUrl?: string
  appliable?: boolean
  applyText?: string
  timeStr?: string
  address?: string
  city?: string
  start?: number
  joinCount?: number
  count?: number
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const formatStart = (ts?: number) => {
  if (!ts) return { mmdd: '—', weekday: '' }
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { mmdd: `${mm}.${dd}`, weekday: WEEKDAYS[d.getDay()] }
}

const parseDistance = (address?: string) => {
  if (!address) return ''
  const m = address.match(/(\d+\.?\d*)\s*[Kk][Mm]/)
  return m ? m[0].toUpperCase() : ''
}

export default function EventsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const clubId = 'xbc3mQnYPR'

  useLoad(() => { loadActivities() })

  const loadActivities = async () => {
    try {
      const res = await request<{ data: Activity[] }>({
        url: `/activities/list?page=0&pageSize=10&club=${clubId}`,
        auth: false,
      })
      setActivities(res?.data || [])
    } catch {
      setActivities(getMockActivitiesList(clubId).data as Activity[])
    } finally {
      setLoading(false)
    }
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    return url.trim().replace(/^`+|`+$/g, '')
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${id}` })
  }

  const renderCard = (activity: Activity) => {
    const poster = normalizeUrl(activity.posterUrl) || activity.posterUrl
    const { mmdd, weekday } = formatStart(activity.start)
    const distance = parseDistance(activity.address)
    const capacity = activity.count
      ? `${activity.joinCount ?? 0} / ${activity.count}`
      : ''

    return (
      <View key={activity.id} className='event-item' onClick={() => goDetail(activity.id)}>

        {/* ── 1. 干净海报 ── */}
        <View className='event-poster-wrap'>
          {poster ? (
            <Image src={poster} className='event-poster' mode='aspectFill' />
          ) : (
            <View className='event-poster placeholder' />
          )}
        </View>

        {/* ── 2. 活动信息 ── */}
        <View className='event-info'>

          {/* 标题行 */}
          <View className='info-title-row'>
            <View className='info-title-block'>
              <Text className='info-name'>{activity.name}</Text>
              {!!activity.subtitle && (
                <Text className='info-subtitle'>{activity.subtitle}</Text>
              )}
            </View>
          </View>

          {/* 元信息行 */}
          <View className='info-meta-row'>
            {/* 日期 */}
            <View className='meta-item'>
              <Text className='meta-label'>DATE</Text>
              <Text className='meta-value'>{mmdd}</Text>
              {!!weekday && <Text className='meta-sub'>{weekday}</Text>}
            </View>

            <View className='meta-divider' />

            {/* 地点 */}
            <View className='meta-item flex-2'>
              <Text className='meta-label'>LOCATION</Text>
              <Text className='meta-value' numberOfLines={1}>{activity.city || '—'}</Text>
              {!!activity.address && (
                <Text className='meta-sub' numberOfLines={1}>{activity.address}</Text>
              )}
            </View>

            {!!distance && <View className='meta-divider' />}

            {/* 距离 */}
            {!!distance && (
              <View className='meta-item'>
                <Text className='meta-label'>DIST</Text>
                <Text className='meta-value'>{distance}</Text>
              </View>
            )}
          </View>

          {/* 底部：人数 + 报名按钮 */}
          <View className='info-footer'>
            {!!capacity && (
              <View className='footer-capacity'>
                <Text className='capacity-num'>{capacity}</Text>
                <Text className='capacity-label'>已报名</Text>
              </View>
            )}
            <View
              className={`footer-btn ${!activity.appliable ? 'disabled' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                if (activity.appliable) goDetail(activity.id)
              }}
            >
              <Text className='footer-btn-text'>
                {activity.appliable ? '立即报名' : (activity.applyText || '已截止')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='events-page'>
      <View className='events-header'>
        <Text className='events-title'>EVENTS</Text>
        <Text className='events-sub'>即将活动</Text>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : (
        <ScrollView scrollY className='events-scroll'>
          {activities.map(renderCard)}
          <View className='scroll-spacer' />
        </ScrollView>
      )}

      <BottomNav current='events' />
    </View>
  )
}
