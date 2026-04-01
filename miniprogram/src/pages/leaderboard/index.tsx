import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import { getUserInfo } from '../../utils/auth'
import './index.scss'

interface LeaderEntry {
  rank: number
  userId: number
  nickname: string
  avatar?: string
  checkin_count: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const user = getUserInfo()

  useLoad(() => {
    loadLeaderboard()
  })

  const loadLeaderboard = async () => {
    try {
      const data = await request<LeaderEntry[]>({ url: '/leaderboard', auth: false })
      setEntries(data)
    } catch (e) {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const myRank = entries.find(e => e.userId === user?.id)

  return (
    <View className='leaderboard-page'>
      <View className='page-header'>
        <Text className='header-title'>LEADERBOARD</Text>
        <Text className='header-sub'>签到排行榜</Text>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View className='empty'>
          <Text className='empty-text'>暂无数据</Text>
        </View>
      ) : (
        <>
          {myRank && (
            <View className='my-rank-bar'>
              <Text className='my-rank-label'>我的排名</Text>
              <Text className='my-rank-num'>#{myRank.rank}</Text>
              <Text className='my-rank-count'>{myRank.checkin_count} 次签到</Text>
            </View>
          )}

          <ScrollView scrollY className='leader-list'>
            {entries.map((entry) => {
              const isMe = entry.userId === user?.id
              const isTop3 = entry.rank <= 3
              return (
                <View key={entry.userId} className={`leader-row ${isMe ? 'is-me' : ''}`}>
                  <View className={`rank-badge ${isTop3 ? `rank-${entry.rank}` : ''}`}>
                    <Text className='rank-text'>{entry.rank}</Text>
                  </View>
                  <View className='leader-avatar'>
                    {entry.avatar ? (
                      <Image src={entry.avatar} className='avatar-img' lazyLoad />
                    ) : (
                      <View className='avatar-placeholder'>
                        <Text className='avatar-initial'>{entry.nickname[0]}</Text>
                      </View>
                    )}
                  </View>
                  <Text className='leader-name'>{entry.nickname}{isMe ? ' (我)' : ''}</Text>
                  <View className='leader-count-wrap'>
                    <Text className='leader-count'>{entry.checkin_count}</Text>
                    <Text className='leader-count-label'>次</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </>
      )}
    </View>
  )
}
