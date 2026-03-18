import { View, Text, Image } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import './index.scss'

interface CheckinData {
  qrcode: string
  registration: {
    id: number
    status: string
    pace?: string
    distance?: string
    event?: { title: string; date: string; location: string }
    user?: { nickname: string }
  }
}

export default function CheckinPage() {
  const router = useRouter()
  const regId = router.params.id
  const [data, setData] = useState<CheckinData | null>(null)
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    if (!regId) { Taro.navigateBack(); return }
    loadQrCode(+regId)
  })

  const loadQrCode = async (id: number) => {
    try {
      const res = await request<CheckinData>({ url: `/registrations/${id}/qrcode` })
      setData(res)
    } catch (e) {
      Taro.showToast({ title: '获取签到码失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View className='checkin-loading'>
        <Text className='loading-text'>LOADING...</Text>
      </View>
    )
  }

  if (!data) return null

  const reg = data.registration
  const isCheckedIn = reg.status === 'checked_in'

  return (
    <View className='checkin-page'>
      <View className='checkin-header'>
        <Text className='checkin-title'>签到码</Text>
        <Text className='checkin-event'>{reg.event?.title}</Text>
        <Text className='checkin-date'>{reg.event ? formatDate(reg.event.date) : ''}</Text>
      </View>

      <View className='qr-container'>
        {isCheckedIn ? (
          <View className='checked-in-box'>
            <Text className='checked-icon'>✓</Text>
            <Text className='checked-text'>已签到</Text>
          </View>
        ) : (
          <View className='qr-wrap'>
            <Image src={data.qrcode} className='qr-image' mode='aspectFit' />
            <Text className='qr-hint'>出示此二维码供工作人员扫描</Text>
          </View>
        )}
      </View>

      <View className='checkin-info'>
        <View className='info-row'>
          <Text className='info-label'>跑者</Text>
          <Text className='info-value'>{reg.user?.nickname}</Text>
        </View>
        {reg.pace && (
          <View className='info-row'>
            <Text className='info-label'>配速</Text>
            <Text className='info-value'>{reg.pace}</Text>
          </View>
        )}
        {reg.distance && (
          <View className='info-row'>
            <Text className='info-label'>距离</Text>
            <Text className='info-value'>{reg.distance}</Text>
          </View>
        )}
        <View className='info-row'>
          <Text className='info-label'>状态</Text>
          <Text className={`info-status ${isCheckedIn ? 'status-checked' : 'status-pending'}`}>
            {isCheckedIn ? '已签到' : '待签到'}
          </Text>
        </View>
      </View>
    </View>
  )
}
