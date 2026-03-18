import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request } from '../../utils/request'
import { getUserInfo, logout } from '../../utils/auth'
import './index.scss'

interface UserPointsInfo {
  points_balance: number
}

interface Registration {
  id: number
  status: string
  pace?: string
  distance?: string
  bag_storage?: boolean
  coffee?: boolean
  checkin_time?: string
  created_at: string
  event?: {
    id: number
    title: string
    date: string
    location: string
    route: string
  }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: '审核中', cls: 'status-pending' },
  approved:   { label: '报名成功', cls: 'status-open' },
  checked_in: { label: '已签到', cls: 'status-checkin' },
  cancelled:  { label: '已取消', cls: 'status-cancel' },
  rejected:   { label: '已拒绝', cls: 'status-cancel' },
}

export default function MyPage() {
  const [regs, setRegs] = useState<Registration[]>([])
  const [myPoints, setMyPoints] = useState<UserPointsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const user = getUserInfo()

  useLoad(() => {
    loadAll()
  })

  const loadAll = async () => {
    try {
      const [data, pts] = await Promise.all([
        request<Registration[]>({ url: '/registrations/my' }),
        request<UserPointsInfo>({ url: '/points/my' }).catch(() => null),
      ])
      setRegs(data)
      setMyPoints(pts)
    } catch (e) {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const loadMyRegs = loadAll

  const goCheckin = (regId: number) => {
    Taro.navigateTo({ url: `/pages/checkin/index?id=${regId}` })
  }

  const goEventDetail = (eventId: number) => {
    Taro.navigateTo({ url: `/pages/events/detail?id=${eventId}` })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const checkinCount = regs.filter(r => r.status === 'checked_in').length
  const activeCount = regs.filter(r => r.status !== 'cancelled' && r.status !== 'rejected').length
  const goAdmin = () => Taro.navigateTo({ url: '/pages/admin/index' })

  const handleCancel = (reg: Registration) => {
    Taro.showModal({
      title: '取消报名',
      content: `确认取消「${reg.event?.title}」的报名？`,
      confirmText: '取消报名',
      cancelText: '再想想',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/registrations/${reg.id}/cancel`, method: 'POST' })
          Taro.showToast({ title: '已取消报名', icon: 'success' })
          loadAll()
        } catch (e) {}
      },
    })
  }

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
          <View className='profile-stats'>
            <View className='stat-item'>
              <Text className='stat-num'>{activeCount}</Text>
              <Text className='stat-label'>活动</Text>
            </View>
            <View className='stat-divider' />
            <View className='stat-item'>
              <Text className='stat-num'>{checkinCount}</Text>
              <Text className='stat-label'>签到</Text>
            </View>
          </View>
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
          <Text className='points-entry-num'>{myPoints?.points_balance ?? '--'}</Text>
          <Text className='points-entry-arrow'>→</Text>
        </View>
      </View>

      <View className='section-header'>
        <Text className='section-title'>我的报名</Text>
      </View>

      <View className='regs-content'>
      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : regs.length === 0 ? (
        <View className='empty'>
          <Text className='empty-text'>暂无报名记录</Text>
          <View className='go-events-btn' onClick={() => Taro.navigateTo({ url: '/pages/events/index' })}>
            <Text className='go-events-text'>去报名活动</Text>
          </View>
        </View>
      ) : (
        <View className='regs-list'>
          {regs.map((reg) => {
            const statusInfo = STATUS_MAP[reg.status] || STATUS_MAP.pending
            return (
              <View key={reg.id} className='reg-card'>
                <View className='reg-card-top' onClick={() => reg.event && goEventDetail(reg.event.id)}>
                  <View className='reg-event-info'>
                    <Text className='reg-event-title'>{reg.event?.title || '活动'}</Text>
                    <Text className='reg-event-date'>{reg.event ? formatDate(reg.event.date) : ''}</Text>
                    <Text className='reg-event-loc'>📍 {reg.event?.location}</Text>
                  </View>
                  <View className={`reg-status ${statusInfo.cls}`}>
                    <Text className='reg-status-text'>{statusInfo.label}</Text>
                  </View>
                </View>

                <View className='reg-meta'>
                  {reg.pace && <Text className='reg-tag'>{reg.pace}</Text>}
                  {reg.distance && <Text className='reg-tag'>{reg.distance}</Text>}
                  {reg.bag_storage && <Text className='reg-tag'>行李寄存</Text>}
                  {reg.coffee && <Text className='reg-tag'>咖啡</Text>}
                </View>

                {(reg.status === 'pending' || reg.status === 'approved') && (
                  <View className='reg-actions'>
                    {reg.status === 'approved' && (
                      <View className='reg-action' onClick={() => goCheckin(reg.id)}>
                        <Text className='reg-action-text'>查看签到二维码 →</Text>
                      </View>
                    )}
                    <View className='reg-cancel-btn' onClick={() => handleCancel(reg)}>
                      <Text className='reg-cancel-text'>取消报名</Text>
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      )}
      </View>

      <BottomNav current='my' />
    </View>
  )
}
