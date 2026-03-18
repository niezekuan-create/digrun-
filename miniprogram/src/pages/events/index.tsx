import { View, Text, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import { isLoggedIn } from '../../utils/auth'
import './index.scss'

const BASE_URL = 'http://localhost:3001'

interface Event {
  id: number
  title: string
  date: string
  location: string
  route: string
  max_people: number
  registration_count?: number
  cover_image?: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

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

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const renderCard = (event: Event, ended: boolean) => {
    const { monthDay, weekday } = formatDate(event.date)
    const count = event.registration_count || 0
    const isFull = count >= event.max_people

    if (event.cover_image) {
      return (
        <View key={event.id} className={`event-card-cover ${ended ? 'ended' : ''}`} onClick={() => goDetail(event.id)}>
          <View className='event-cover-wrap'>
            <Image src={`${BASE_URL}${event.cover_image}`} className='event-cover-img' mode='aspectFill' />
            <View className='event-cover-overlay'>
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
          <View className='event-cover-info'>
            <View className='event-cover-date'>
              <Text className='event-month-day'>{monthDay}</Text>
              <Text className='event-weekday'>{weekday}</Text>
            </View>
            <View className='event-cover-text'>
              <Text className='event-title'>{event.title}</Text>
              <Text className='event-location'>📍 {event.location} · {event.route}</Text>
            </View>
            {!ended && <Text className='event-count'>{count}/{event.max_people}</Text>}
          </View>
        </View>
      )
    }

    return (
      <View key={event.id} className={`event-card ${ended ? 'ended' : ''}`} onClick={() => goDetail(event.id)}>
        <View className='event-date-block'>
          <Text className='event-month-day'>{monthDay}</Text>
          <Text className='event-weekday'>{weekday}</Text>
        </View>
        <View className='event-info'>
          <Text className='event-title'>{event.title}</Text>
          <Text className='event-location'>📍 {event.location}</Text>
          <Text className='event-route'>{event.route}</Text>
        </View>
        <View className='event-right'>
          {ended ? (
            <View className='event-status ended'>
              <Text className='event-status-text'>ENDED</Text>
            </View>
          ) : (
            <>
              <View className={`event-status ${isFull ? 'full' : 'open'}`}>
                <Text className='event-status-text'>{isFull ? 'FULL' : 'OPEN'}</Text>
              </View>
              <Text className='event-count'>{count}/{event.max_people}</Text>
            </>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className='events-page'>
      <View className='page-header'>
        <Text className='header-title'>EVENTS</Text>
        <Text className='header-sub'>活动列表</Text>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : events.length === 0 ? (
        <View className='empty'>
          <Text className='empty-text'>暂无活动</Text>
        </View>
      ) : (
        <View className='events-list'>
          {upcoming.length > 0 && (
            <View>
              <View className='section-header'>
                <Text className='section-label'>即将开始</Text>
              </View>
              {upcoming.map(e => renderCard(e, false))}
            </View>
          )}

          {past.length > 0 && (
            <View>
              <View className='section-header section-past'>
                <Text className='section-label'>往期活动</Text>
              </View>
              {past.map(e => renderCard(e, true))}
            </View>
          )}
        </View>
      )}

      <BottomNav current='events' />
    </View>
  )
}
