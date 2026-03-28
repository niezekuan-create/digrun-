import { View, Text, Canvas } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import drawQrcode from '../../utils/weappQrcode'
import { getUserInfo } from '../../utils/auth'
import './index.scss'

export default function CheckinPage() {
  const router = useRouter()
  const activityId = String(router.params.activityId || router.params.id || '')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const user = getUserInfo()
  const userId = user?.id
  const nickname = user?.nickname || ''
  const qrcodeCanvasId = 'checkinQrcode'

  useLoad(() => {
    if (!activityId || !userId) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 800)
      return
    }
    setLoading(false)
    Taro.nextTick(() => {
      try {
        const sys = Taro.getSystemInfoSync()
        const windowWidth = sys?.windowWidth || 375
        const canvasPx = Math.round((440 / 750) * windowWidth)
        const marginPx = Math.max(10, Math.round(canvasPx * 0.06))
        const drawPx = Math.max(0, canvasPx - marginPx * 2)

        drawQrcode({
          canvasId: qrcodeCanvasId,
          width: drawPx,
          height: drawPx,
          x: marginPx,
          y: marginPx,
          background: '#ffffff',
          foreground: '#000000',
          text: JSON.stringify({ userId, activityId }),
        })
        setReady(true)
      } catch (e) {
        Taro.showToast({ title: '生成签到码失败', icon: 'none' })
      }
    })
  })

  if (loading) {
    return (
      <View className='checkin-loading'>
        <Text className='loading-text'>LOADING...</Text>
      </View>
    )
  }

  return (
    <View className='checkin-page'>
      <View className='checkin-header'>
        <Text className='checkin-title'>签到码</Text>
        <Text className='checkin-event'>活动签到</Text>
        <Text className='checkin-date'>{activityId}</Text>
      </View>

      <View className='qr-container'>
        <View className='qr-wrap'>
          <Canvas className={`qr-image${ready ? '' : ' qr-image-loading'}`} canvasId={qrcodeCanvasId} />
          <Text className='qr-hint'>出示此二维码供工作人员扫描</Text>
        </View>
      </View>

      <View className='checkin-info'>
        <View className='info-row'>
          <Text className='info-label'>跑者</Text>
          <Text className='info-value'>{nickname || '-'}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>状态</Text>
          <Text className='info-status status-pending'>
            待签到
          </Text>
        </View>
      </View>
    </View>
  )
}
