import { View, Text, Image } from '@tarojs/components'
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

  const handleLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      await login()
      Taro.reLaunch({ url: '/pages/events/index' })
    } catch (e) {
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
          <View
            className={`splash-btn ${loading ? 'loading' : ''}`}
            onClick={handleLogin}
          >
            <Text className='splash-btn-text'>
              {loading ? '登录中...' : '微信一键登录'}
            </Text>
          </View>
          <Text className='splash-hint'>登录即代表同意服务协议</Text>
        </View>
      </View>
    </View>
  )
}
