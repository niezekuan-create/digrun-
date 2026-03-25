import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useRef } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import { getMockActivitiesList } from '../../utils/mockData'
import './index.scss'

type TabKey = 'upcoming' | 'ended'

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
  const [tab, setTab] = useState<TabKey>('upcoming')
  const [upcoming, setUpcoming] = useState<Activity[]>([])
  const [ended, setEnded] = useState<Activity[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingEnded, setLoadingEnded] = useState(false)
  const loadedEnded = useRef(false)
  const clubId = 'xbc3mQnYPR'

  useLoad(() => { loadTab('upcoming') })

  const loadTab = async (t: TabKey) => {
    if (t === 'ended' && loadedEnded.current) return
    if (t === 'ended') setLoadingEnded(true)

    try {
      const res = await request<{ data: Activity[] }>({
        url: `/activities/list?page=0&pageSize=20&club=${clubId}&status=${t}`,
        auth: false,
      })
      const data = res?.data || []
      if (t === 'upcoming') setUpcoming(data)
      else setEnded(data)
    } catch {
      const data = getMockActivitiesList(clubId, t).data as Activity[]
      if (t === 'upcoming') setUpcoming(data)
      else setEnded(data)
    } finally {
      if (t === 'upcoming') setLoadingUpcoming(false)
      else { setLoadingEnded(false); loadedEnded.current = true }
    }
  }

  const switchTab = (t: TabKey) => {
    if (t === tab) return
    setTab(t)
    loadTab(t)
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    return url.trim().replace(/^`+|`+$/g, '')
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${id}` })
  }

  const renderCard = (activity: Activity, isEnded: boolean) => {
    const poster = normalizeUrl(activity.posterUrl)
    const { mmdd, weekday } = formatStart(activity.start)
    const distance = parseDistance(activity.address)
    const capacity = activity.count
      ? `${activity.joinCount ?? 0} / ${activity.count}`
      : ''

    return (
      <View key={activity.id} className={`event-item${isEnded ? ' event-item-ended' : ''}`} onClick={() => goDetail(activity.id)}>

        {/* 海报 */}
        <View className='event-poster-wrap'>
          {poster ? (
            <Image src={poster} className='event-poster' mode='aspectFill' />
          ) : (
            <View className='event-poster placeholder' />
          )}
          {isEnded && <View className='poster-ended-mask'><Text className='poster-ended-text'>已结束</Text></View>}
        </View>

        {/* 信息 */}
        <View className='event-info'>
          <View className='info-title-row'>
            <View className='info-title-block'>
              <Text className='info-name'>{activity.name}</Text>
              {!!activity.subtitle && (
                <Text className='info-subtitle'>{activity.subtitle}</Text>
              )}
            </View>
          </View>

          <View className='info-meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>DATE</Text>
              <Text className='meta-value'>{mmdd}</Text>
              {!!weekday && <Text className='meta-sub'>{weekday}</Text>}
            </View>

            <View className='meta-divider' />

            <View className='meta-item flex-2'>
              <Text className='meta-label'>LOCATION</Text>
              <Text className='meta-value' numberOfLines={1}>{activity.city || '—'}</Text>
              {!!activity.address && (
                <Text className='meta-sub' numberOfLines={1}>{activity.address}</Text>
              )}
            </View>

            {!!distance && <View className='meta-divider' />}
            {!!distance && (
              <View className='meta-item'>
                <Text className='meta-label'>DIST</Text>
                <Text className='meta-value'>{distance}</Text>
              </View>
            )}
          </View>

          <View className='info-footer'>
            {!!capacity && (
              <View className='footer-capacity'>
                <Text className='capacity-num'>{capacity}</Text>
                <Text className='capacity-label'>已报名</Text>
              </View>
            )}
            {!isEnded && (
              <View
                className={`footer-btn${!activity.appliable ? ' disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (activity.appliable) goDetail(activity.id)
                }}
              >
                <Text className='footer-btn-text'>
                  {activity.appliable ? '立即报名' : (activity.applyText || '已截止')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  const activities = tab === 'upcoming' ? upcoming : ended
  const loading = tab === 'upcoming' ? loadingUpcoming : loadingEnded

  return (
    <View className='events-page'>
      <View className='events-header'>
        <Text className='events-title'>EVENTS</Text>
        <View className='events-tabs'>
          <View className={`events-tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => switchTab('upcoming')}>
            <Text className='events-tab-text'>即将开始</Text>
          </View>
          <View className={`events-tab${tab === 'ended' ? ' active' : ''}`} onClick={() => switchTab('ended')}>
            <Text className='events-tab-text'>已结束</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : activities.length === 0 ? (
        <View className='loading'>
          <Text className='loading-text'>暂无活动</Text>
        </View>
      ) : (
        <ScrollView scrollY className='events-scroll'>
          {activities.map(a => renderCard(a, tab === 'ended'))}
          <View className='scroll-spacer' />
        </ScrollView>
      )}

      <BottomNav current='events' />
    </View>
  )
}
