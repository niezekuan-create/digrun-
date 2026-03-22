import { View, Text, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request, userManager } from '../../utils/request'
import { getUserInfo, logout, setUserInfo } from '../../utils/auth'
import './index.scss'

interface ApiRes<T> {
  data: T
  err: boolean
  msg?: string
}

export default function MyPage() {
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [user, setUser] = useState(() => getUserInfo())
  const clubId = 'xbc3mQnYPR'

  useLoad(() => {
    if (!userManager.hasToken()) {
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }
    loadAll()
  })

  const loadAll = async () => {
    try {
      const [pts, info] = await Promise.all([
        request<ApiRes<number>>({ url: `/club/${clubId}/point` }),
        request<ApiRes<any> | any>({ url: '/user/info' }),
      ])

      if (pts?.err) throw new Error('points_failed')
      setMyPoints(typeof pts?.data === 'number' ? pts.data : null)

      const userInfo = (info as any)?.err === false ? (info as any)?.data : (info as any)
      if (userInfo) {
        setUserInfo(userInfo)
        setUser(userInfo)
      }
    } catch (e) {
      if (!userManager.hasToken()) {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
    }
  }
  const goAdmin = () => Taro.navigateTo({ url: '/pages/admin/index' })

  return (
    <View className='my-page'>
      <View className='profile-header'>
        <View className='avatar-wrap'>
          {user?.avatar ? (
            <Image src={user.avatar} className='avatar' />
          ) : (
            <View className='avatar-placeholder'>
              <Text className='avatar-text'>{user?.nickname?.[0] || 'R'}</Text>
            </View>
          )}
        </View>
        <View className='profile-info'>
          <Text className='profile-name'>{user?.nickname || '跑者'}</Text>
        </View>
        <View className='header-actions'>
          {user?.is_admin && (
            <View className='admin-btn' onClick={goAdmin}>
              <Text className='admin-btn-text'>ADMIN</Text>
            </View>
          )}
          <View className='logout-btn' onClick={logout}>
            <Text className='logout-text'>退出</Text>
          </View>
        </View>
      </View>

      <View className='points-entry' onClick={() => Taro.navigateTo({ url: '/pages/points/my' })}>
        <View className='points-entry-left'>
          <Text className='points-entry-icon'>◇</Text>
          <Text className='points-entry-label'>我的积分</Text>
        </View>
        <View className='points-entry-right'>
          <Text className='points-entry-num'>{myPoints ?? '--'}</Text>
          <Text className='points-entry-arrow'>→</Text>
        </View>
      </View>

      <BottomNav current='my' />
    </View>
  )
}
