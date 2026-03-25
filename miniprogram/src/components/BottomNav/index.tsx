import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { userManager } from '../../utils/request'
import './index.scss'

const iconEvents = require('../../assets/icons/活动-白.png')
const iconEventsOff = require('../../assets/icons/活动-灰.png')
const iconPodcast = require('../../assets/icons/播客-白.png')
const iconPodcastOff = require('../../assets/icons/播客-灰.png')
const iconMall = require('../../assets/icons/积分商城-白.png')
const iconMallOff = require('../../assets/icons/积分商场-灰.png')
const iconMy = require('../../assets/icons/我的-白.png')
const iconMyOff = require('../../assets/icons/我的-灰.png')

interface Props {
  current: 'events' | 'podcast' | 'mall' | 'my'
}

const tabs = [
  { key: 'events',  label: '活动',    path: '/pages/events/index', icon: iconEvents,  iconOff: iconEventsOff  },
  { key: 'podcast', label: '播客',    path: '/pages/podcast/index', icon: iconPodcast, iconOff: iconPodcastOff },
  { key: 'mall',    label: '积分商城', path: '/pages/points/mall',  icon: iconMall,    iconOff: iconMallOff    },
  { key: 'my',      label: '我的',    path: '/pages/my/index',      icon: iconMy,      iconOff: iconMyOff      },
]

export default function BottomNav({ current }: Props) {
  const navigate = (path: string, key: string) => {
    if (key === 'my') {
      if (userManager.hasToken()) {
        Taro.redirectTo({ url: path })
      } else {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
      return
    }
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
