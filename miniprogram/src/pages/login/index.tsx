import { View, Text, Image, Button } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { isLoggedIn, login } from '../../utils/auth'
import './index.scss'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    if (isLoggedIn()) {
      Taro.reLaunch({ url: '/pages/events/index' })
    }
  })

  const handleGetPhoneNumber = async (e: any) => {
    if (loading) return
    if (e?.detail?.errMsg !== 'getPhoneNumber:ok') {
      Taro.showToast({ title: '未授权手机号', icon: 'none' })
      return
    }
    const phoneCode = e?.detail?.code
    if (process.env.NODE_ENV !== 'production') {
      console.log('wx phone code:', phoneCode)
    }
    if (!phoneCode) {
      Taro.showToast({ title: '获取 code 失败', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await login(phoneCode)
      Taro.reLaunch({ url: '/pages/events/index' })
    } catch (err) {
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='splash-page'>
      {/* 全屏背景图 */}
      <Image
        src={require('../../assets/images/splash.jpg')}
        className='splash-bg'
        mode='aspectFill'
      />

      {/* 暗色遮罩 */}
      <View className='splash-overlay' />

      {/* 内容层 */}
      <View className='splash-content'>
        {/* 中央 Logo */}
        <View className='logo-wrap'>
          <Image
            src={require('../../assets/images/logo.png')}
            className='splash-logo'
            mode='aspectFit'
          />
        </View>

        {/* 底部登录区 */}
        <View className='splash-bottom'>
          <Button
            className={`splash-btn ${loading ? 'loading' : ''}`}
            openType='getPhoneNumber'
            onGetPhoneNumber={handleGetPhoneNumber}
            disabled={loading}
          >
            <Text className='splash-btn-text'>
              {loading ? '登录中...' : '微信一键登录（获取手机号）'}
            </Text>
          </Button>
          <Text className='splash-hint'>登录即代表同意服务协议</Text>
        </View>
      </View>
    </View>
  )
}
