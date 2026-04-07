import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const iconEvents = require('../../assets/icons/活动-白.png')
const iconEventsOff = require('../../assets/icons/活动-灰.png')
const iconMy = require('../../assets/icons/我的-白.png')
const iconMyOff = require('../../assets/icons/我的-灰.png')

interface Props {
  current: 'events' | 'podcast' | 'mall' | 'my'
}

const tabs = [
  { key: 'events',  label: '活动',    path: '/pages/events/index', icon: iconEvents,  iconOff: iconEventsOff  },
  { key: 'my',      label: '我的',    path: '/pages/my/index',      icon: iconMy,      iconOff: iconMyOff      },
]

export default function BottomNav({ current }: Props) {
  const navigate = (path: string, key: string) => {
    if (key === current) return
    Taro.redirectTo({ url: path })
  }

  return (
    <View className='bottom-nav'>
      {tabs.map((tab) => {
        const active = current === tab.key
        return (
          <View
            key={tab.key}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => navigate(tab.path, tab.key)}
          >
            <Image
              src={active ? tab.icon : tab.iconOff}
              className='nav-icon'
              mode='aspectFit'
            />
            <Text className='nav-label'>{tab.label}</Text>
          </View>
        )
      })}
    </View>
  )
}
