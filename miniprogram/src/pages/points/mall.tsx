import { View, Text } from '@tarojs/components'
import BottomNav from '../../components/BottomNav/index'
import './mall.scss'

export default function MallPage() {
  return (
    <View className='mall-page'>
      <View className='mall-header'>
        <View className='mall-title-row'>
          <Text className='mall-title'>POINTS MALL</Text>
        </View>
        <Text className='mall-sub'>签到获取积分，兑换专属权益</Text>
      </View>

      <View className='empty'>
        <Text className='empty-title'>商城筹备中</Text>
        <Text className='empty-sub'>即将上线，敬请期待</Text>
      </View>
      <BottomNav current='mall' />
    </View>
  )
}
