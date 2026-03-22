import { View, Text, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import './index.scss'


interface Activity {
  id: string
  name: string
  subtitle?: string
  posterUrl?: string
  appliable?: boolean
  applyText?: string
  timeStr?: string
  route?: string
}

export default function EventsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const clubId = 'xbc3mQnYPR'

  useLoad(() => {
    loadActivities()
  })

  const loadActivities = async () => {
    try {
      const res = await request<{ data: Activity[] }>({
        url: `/activities/list?page=0&pageSize=10&club=${clubId}`,
        auth: false,
      })
      setActivities(res?.data || [])
    } catch (e) {
      // error handled in request util
    } finally {
      setLoading(false)
    }
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    return url.trim().replace(/^`+|`+$/g, '')
  }

  const goDetail = (activityId: string) => {
    if (!activityId) return
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${activityId}` })
  }

  const renderActivityCard = (activity: Activity) => {
    const posterUrl = normalizeUrl(activity.posterUrl)
    const title = activity.name || ''
    const subtitle = activity.subtitle || activity.timeStr || ''
    const ctaText = activity.appliable ? '参与' : activity.applyText || '已截止'
    const ctaDisabled = !activity.appliable
    return (
      <View key={activity.id} className='activity-card' onClick={() => goDetail(activity.id)}>
        {posterUrl ? (
          <Image src={posterUrl} className='activity-bg' mode='aspectFill' />
        ) : (
          <View className='activity-bg placeholder' />
        )}
        <View className='activity-overlay-top'>
          <Text className='activity-title'>{title}</Text>
          {!!subtitle && <Text className='activity-subtitle'>{subtitle}</Text>}
        </View>
        <View className='activity-overlay-bottom' />
        <View
          className={`activity-cta ${ctaDisabled ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            goDetail(activity.id)
          }}
        >
          <Text className='activity-cta-text'>{ctaText}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='events-page'>
      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : (
        <View className='events-list'>
          {activities.map(renderActivityCard)}
        </View>
      )}

      <BottomNav current='events' />
    </View>
  )
}
