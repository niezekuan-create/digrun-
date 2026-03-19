import { View, Text, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request, BASE_URL } from '../../utils/request'
import { isLoggedIn } from '../../utils/auth'
import './index.scss'


interface Event {
  id: number
  title: string
  date: string
  location: string
  route: string
  max_people: number
  registration_count?: number
  cover_image?: string
  status?: string
  event_start_time?: string
  event_end_time?: string
  signup_start_time?: string
  signup_end_time?: string
}

type TabType = 'upcoming' | 'finished'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')

  useLoad(() => {
    if (!isLoggedIn()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    loadEvents()
  })

  const loadEvents = async () => {
    try {
      const data = await request<Event[]>({ url: '/events', auth: false })
      setEvents(data)
    } catch (e) {
      // error handled in request util
    } finally {
      setLoading(false)
    }
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/events/detail?id=${id}` })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return { monthDay: `${month}.${day}`, weekday: weekdays[d.getDay()], year: d.getFullYear() }
  }

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start) return ''
    const hm = (iso: string) => iso.slice(11, 16)
    return end ? `${hm(start)} - ${hm(end)}` : hm(start)
  }

  const now = new Date()

  // Upcoming: date >= now, only published (backend already filters offline/deleted)
  const upcoming = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Finished: date < now, sorted by most recently ended first
  const finished = events
    .filter(e => new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const renderEventCard = (event: Event, ended: boolean) => {
    const { monthDay, weekday } = formatDate(event.event_start_time || event.date)
    const count = event.registration_count || 0
    const isFull = count >= event.max_people
    const timeRange = formatTimeRange(event.event_start_time, event.event_end_time)
    return (
      <View key={event.id} className={`event-card-unified ${ended ? 'ended' : ''}`} onClick={() => goDetail(event.id)}>
        {/* 海报区 — 纯视觉，只保留右上角状态角标 */}
        <View className='event-card-inner'>
          {event.cover_image ? (
            <Image src={`${BASE_URL}${event.cover_image}`} className='event-card-img' mode='aspectFill' />
          ) : (
            <View className='event-card-placeholder' />
          )}
          <View className='event-badge-row'>
            {ended ? (
              <View className='event-status ended'>
                <Text className='event-status-text'>ENDED</Text>
              </View>
            ) : (
              <View className={`event-status ${isFull ? 'full' : 'open'}`}>
                <Text className='event-status-text'>{isFull ? 'FULL' : 'OPEN'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 信息区 — 海报下方独立展示 */}
        <View className='event-card-info'>
          <Text className='event-card-date'>{monthDay} {weekday}{timeRange ? `  ${timeRange}` : ''}</Text>
          <Text className='event-card-title'>{event.title}</Text>
          <Text className='event-card-loc'>{event.location} · {event.route}</Text>
          <Text className='event-card-count'>{count}/{event.max_people} 人</Text>
        </View>
      </View>
    )
  }

  const renderTabContent = () => {
    if (activeTab === 'upcoming') {
      if (upcoming.length === 0) {
        return (
          <View className='tab-empty'>
            <Text className='tab-empty-text'>暂无即将开始的活动</Text>
          </View>
        )
      }
      return <View>{upcoming.map(e => renderEventCard(e, false))}</View>
    }

    if (finished.length === 0) {
      return (
        <View className='tab-empty'>
          <Text className='tab-empty-text'>暂无往期活动</Text>
        </View>
      )
    }
    return <View>{finished.map(e => renderEventCard(e, true))}</View>
  }

  return (
    <View className='events-page'>
      <View className='page-header'>
        <Text className='header-title'>EVENTS</Text>
        <Text className='header-sub'>活动列表</Text>
      </View>

      {/* Tab 分栏 */}
      <View className='events-tabs'>
        <View
          className={`events-tab-item ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Text className='events-tab-text'>即将开始</Text>
          {activeTab === 'upcoming' && upcoming.length > 0 && (
            <Text className='events-tab-count'>{upcoming.length}</Text>
          )}
        </View>
        <View
          className={`events-tab-item ${activeTab === 'finished' ? 'active' : ''}`}
          onClick={() => setActiveTab('finished')}
        >
          <Text className='events-tab-text'>已结束</Text>
          {activeTab === 'finished' && finished.length > 0 && (
            <Text className='events-tab-count'>{finished.length}</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : (
        <View className='events-list'>
          {renderTabContent()}
        </View>
      )}

      <BottomNav current='events' />
    </View>
  )
}
