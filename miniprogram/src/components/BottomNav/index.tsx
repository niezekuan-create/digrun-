import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface Props {
  current: 'events' | 'podcast' | 'mall' | 'my'
}

const tabs = [
  { key: 'events', label: '活动', path: '/pages/events/index', icon: '◎' },
  { key: 'podcast', label: '播客', path: '/pages/podcast/index', icon: '▶' },
  { key: 'mall', label: '积分商城', path: '/pages/points/mall', icon: '◇' },
  { key: 'my', label: '我的', path: '/pages/my/index', icon: '◈' },
]

export default function BottomNav({ current }: Props) {
  const navigate = (path: string, key: string) => {
    if (key === current) return
    Taro.redirectTo({ url: path })
  }

  return (
    <View className='bottom-nav'>
      {tabs.map((tab) => (
        <View
          key={tab.key}
          className={`nav-item ${current === tab.key ? 'active' : ''}`}
          onClick={() => navigate(tab.path, tab.key)}
        >
          <Text className='nav-icon-text'>{tab.icon}</Text>
          <Text className='nav-label'>{tab.label}</Text>
        </View>
      ))}
    </View>
  )
}
