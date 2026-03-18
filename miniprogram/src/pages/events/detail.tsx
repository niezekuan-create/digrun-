import { View, Text, ScrollView } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import { getUserInfo } from '../../utils/auth'
import './detail.scss'

interface Event {
  id: number
  title: string
  date: string
  location: string
  route: string
  description: string
  max_people: number
}

interface Registration {
  id: number
  status: string
}

export default function EventDetailPage() {
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [myReg, setMyReg] = useState<Registration | null>(null)
  const [regCount, setRegCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const eventId = router.params.id

  useLoad(() => {
    if (!eventId) return
    loadData(+eventId)
  })

  const loadData = async (id: number) => {
    try {
      const eventData = await request<Event>({ url: `/events/${id}`, auth: false })
      setEvent(eventData)

      const user = getUserInfo()
      if (user) {
        const myRegs = await request<Registration[]>({ url: '/registrations/my' })
        const found = myRegs.find((r) => (r as any).event?.id === id || (r as any).event_id === id)
        if (found) setMyReg(found)
        // Count approved registrations from my list context; use event registration_count if available
        setRegCount((eventData as any).registration_count ?? 0)
      }
    } catch (e) {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = () => {
    Taro.navigateTo({ url: `/pages/register/index?id=${eventId}` })
  }

  const handleCheckin = () => {
    if (myReg?.status === 'approved') {
      Taro.navigateTo({ url: `/pages/checkin/index?id=${myReg.id}` })
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View className='detail-loading'>
        <Text className='loading-text'>LOADING...</Text>
      </View>
    )
  }

  if (!event) {
    return (
      <View className='detail-loading'>
        <Text className='loading-text'>活动不存在</Text>
      </View>
    )
  }

  const isEnded = new Date(event.date) < new Date()
  const isFull = regCount >= event.max_people
  const isPending = myReg?.status === 'pending'
  const isApproved = myReg?.status === 'approved'
  const isCheckedIn = myReg?.status === 'checked_in'
  const isRejected = myReg?.status === 'rejected'

  return (
    <View className='detail-page'>
      <ScrollView scrollY className='detail-scroll'>
        <View className='detail-hero'>
          <Text className='detail-date'>{formatDate(event.date)}</Text>
          <Text className='detail-title'>{event.title}</Text>
          <View className='detail-badges'>
            {isEnded ? (
              <View className='badge badge-grey'>
                <Text className='badge-text'>已结束</Text>
              </View>
            ) : (
              <View className={`badge ${isFull ? 'badge-grey' : 'badge-white'}`}>
                <Text className='badge-text'>{isFull ? 'FULL' : 'OPEN'}</Text>
              </View>
            )}
            <View className='badge badge-outline'>
              <Text className='badge-text'>{regCount}/{event.max_people} 人</Text>
            </View>
          </View>
        </View>

        <View className='detail-body'>
          <View className='info-row'>
            <Text className='info-label'>地点</Text>
            <Text className='info-value'>{event.location}</Text>
          </View>
          <View className='divider' />
          <View className='info-row'>
            <Text className='info-label'>路线</Text>
            <Text className='info-value'>{event.route}</Text>
          </View>
          <View className='divider' />
          <View className='info-section'>
            <Text className='info-label'>活动详情</Text>
            <Text className='info-desc'>{event.description}</Text>
          </View>
        </View>
      </ScrollView>

      <View className='detail-footer'>
        {isEnded ? (
          isCheckedIn ? (
            <View className='btn-checked'>
              <Text className='btn-text'>✓ 已签到</Text>
            </View>
          ) : (
            <View className='btn-disabled'>
              <Text className='btn-text'>活动已结束</Text>
            </View>
          )
        ) : isCheckedIn ? (
          <View className='btn-checked'>
            <Text className='btn-text'>✓ 已签到</Text>
          </View>
        ) : isPending ? (
          <View className='btn-disabled'>
            <Text className='btn-text'>审核中，等待管理员通过</Text>
          </View>
        ) : isRejected ? (
          <View className='btn-disabled'>
            <Text className='btn-text'>报名已被拒绝</Text>
          </View>
        ) : isApproved ? (
          <View className='footer-row'>
            <View className='btn-primary-dark' onClick={handleCheckin}>
              <Text className='btn-text'>查看签到码</Text>
            </View>
          </View>
        ) : isFull ? (
          <View className='btn-disabled'>
            <Text className='btn-text'>名额已满</Text>
          </View>
        ) : (
          <View className='btn-primary-dark' onClick={handleRegister}>
            <Text className='btn-text'>立即报名</Text>
          </View>
        )}
      </View>
    </View>
  )
}
