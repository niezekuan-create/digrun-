import { View, Text, Image, Button } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { isLoggedIn, login, setUserInfo } from '../../utils/auth'
import { CLUB_ID_CONFIG, request } from '../../utils/request'
import './index.scss'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    if (isLoggedIn()) {
      Taro.redirectTo({ url: '/pages/events/index' })
    }
  })

  const doLogin = async (wxLoginCode: string) => {
    if (loading) return
    setLoading(true)
    try {
      await login(wxLoginCode)
      const info: any = await request<any>({ url: `/api/mini/user/info?clubId=${CLUB_ID_CONFIG}` })
      if (info?.err) throw new Error(info?.msg || info?.message || 'user_info_failed')
      const profile = info?.data
      const u = profile?.user || {}
      if (u?.id) {
        setUserInfo({
          id: u?.id ?? '',
          nickname: u?.username || '',
          username: u?.username || '',
          avatar: u?.avatar || '',
          is_admin: !!profile?.isAdmin,
        } as any)
      }
      Taro.redirectTo({ url: '/pages/events/index' })
    } catch (err: any) {
      const msg = String(err?.message || '')
      Taro.showToast({ title: msg || '登录失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleGetPhoneNumber = async (e: any) => {
    const code = e?.detail?.code
    if (!code) {
      Taro.showToast({ title: '未授权手机号', icon: 'none' })
      return
    }
    await doLogin(code)
  }

  return (
    <View className='splash-page'>
      {/* 全屏背景图 */}
      <Image
        src={require('../../assets/images/splash.jpg')}
        className='splash-bg'
        mode='aspectFill'
        lazyLoad
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
            lazyLoad
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
