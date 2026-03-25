import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import { getMockActivityDetail } from '../../utils/mockData'
import './index.scss'

interface FieldConfig { key: string; label: string; enabled: boolean; required: boolean }
interface EventDetail { id: number | string; title: string; form_config?: { fields: FieldConfig[] } }

const PACE_OPTIONS = ['4:00以内', '4:00-4:30', '4:30-5:00', '5:00-5:30', '5:30-6:00', '6:00以上']
const DISTANCE_OPTIONS = ['5KM', '10KM', '半马', '全马', '其他']

const DEFAULT_FIELDS: FieldConfig[] = [
  { key: 'name',     label: '姓名',   enabled: true,  required: true  },
  { key: 'phone',    label: '电话',   enabled: true,  required: true  },
  { key: 'pace',     label: '配速',   enabled: true,  required: false },
  { key: 'distance', label: '跑步距离', enabled: false, required: false },
]

export default function RegisterPage() {
  const router = useRouter()
  const eventId = router.params.id
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [topPadding, setTopPadding] = useState(0)

  useLoad(async () => {
    try {
      const sys = Taro.getSystemInfoSync()
      const menu = Taro.getMenuButtonBoundingClientRect?.()
      const base = Math.max(sys?.statusBarHeight || 0, menu?.top || 0)
      setTopPadding(base ? base + 8 : 44)
    } catch (e) {
      setTopPadding(44)
    }

    if (!eventId) { Taro.navigateBack(); return }
    try {
      const data = await request<EventDetail>({ url: `/activities/detail/${eventId}`, auth: false })
      const detail = (data as any)?.data ?? data
      setEvent({ id: detail.id ?? eventId, title: detail.name ?? detail.title, form_config: detail.form_config })
    } catch (e) {
      const mock = getMockActivityDetail(eventId)
      if (mock) {
        setEvent({ id: mock.data.id, title: mock.data.name })
      } else {
        Taro.showToast({ title: '活动不存在', icon: 'none' })
      }
    }
  })

  const getFields = (): FieldConfig[] => {
    if (event?.form_config?.fields?.length) {
      return event.form_config.fields.filter(f => f.enabled)
    }
    return DEFAULT_FIELDS.filter(f => f.enabled)
  }

  const setValue = (key: string, value: any) => setFormData(d => ({ ...d, [key]: value }))

  const handleSubmit = async () => {
    if (submitting) return
    const fields = getFields()
    for (const f of fields) {
      if (f.required && !formData[f.key]?.toString().trim()) {
        Taro.showToast({ title: `请填写${f.label}`, icon: 'none' }); return
      }
    }
    setSubmitting(true)
    try {
      await request({
        url: '/registrations',
        method: 'POST',
        data: {
          activity_id: eventId,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
          pace: formData.pace || undefined,
          distance: formData.distance || undefined,
          bag_storage: formData.bag_storage || false,
          coffee: formData.coffee || false,
          form_data: formData,
        },
      })
      Taro.showToast({ title: '报名成功！', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (e: any) {
      if (e?.message === 'Unauthorized' && process.env.NODE_ENV !== 'production') {
        // Dev 模式：mock token 被服务器拒绝，本地模拟报名成功
        Taro.showToast({ title: '[DEV] 报名成功（模拟）', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 1500)
        return
      }
      if (!e?.message || e.message === 'Network Error') {
        Taro.showToast({ title: '报名失败，请重试', icon: 'none' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FieldConfig) => {
    const val = formData[field.key]
    const label = `${field.label}${field.required ? ' *' : ''}`

    if (['bag_storage', 'supply', 'coffee'].includes(field.key)) {
      return (
        <View key={field.key} className='input-row'>
          <Text className='input-label'>{label}</Text>
          <View
            className={`toggle-chip${val ? ' toggle-chip-on' : ''}`}
            onClick={() => setValue(field.key, !val)}
          >
            <Text className='toggle-chip-text'>{val ? '是' : '否'}</Text>
          </View>
        </View>
      )
    }

    if (field.key === 'pace') {
      return (
        <View key={field.key} className='input-row input-row-col'>
          <Text className='input-label'>{label}</Text>
          <ScrollView scrollX className='chip-scroll'>
            <View className='chip-row'>
              {PACE_OPTIONS.map(p => (
                <View
                  key={p}
                  className={`chip${val === p ? ' chip-on' : ''}`}
                  onClick={() => setValue('pace', val === p ? '' : p)}
                >
                  <Text className='chip-text'>{p}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )
    }

    if (field.key === 'distance') {
      return (
        <View key={field.key} className='input-row input-row-col'>
          <Text className='input-label'>{label}</Text>
          <View className='chip-wrap'>
            {DISTANCE_OPTIONS.map(d => (
              <View
                key={d}
                className={`chip${val === d ? ' chip-on' : ''}`}
                onClick={() => setValue('distance', val === d ? '' : d)}
              >
                <Text className='chip-text'>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )
    }

    return (
      <View key={field.key} className='input-row'>
        <Text className='input-label'>{label}</Text>
        <Input
          className='text-input'
          value={val || ''}
          onInput={(e) => setValue(field.key, e.detail.value)}
          type={field.key === 'phone' ? 'number' : 'text'}
          placeholder={
            field.key === 'social_link' ? '小红书 / IG / 抖音链接' :
            field.key === 'wechat' ? '微信号' :
            field.key === 'city' ? '所在城市' : ''
          }
          placeholderClass='input-placeholder'
        />
      </View>
    )
  }

  if (!event) {
    return (
      <View className='register-page'>
        <View className='loading-wrap'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      </View>
    )
  }

  const fields = getFields()

  return (
    <View className='register-page'>
      <View className='reg-topbar' style={{ paddingTop: `${topPadding}px` }}>
        <View className='topbar-back' onClick={() => Taro.navigateBack()}>
          <Text className='topbar-back-icon'>←</Text>
        </View>
      </View>

      <View className='reg-header'>
        <Text className='reg-label'>REGISTER</Text>
        <Text className='reg-title'>{event.title}</Text>
      </View>

      <ScrollView scrollY className='reg-scroll'>
        <View className='reg-body'>
          <View className='input-group'>
            {fields.map((field, idx) => (
              <View key={field.key}>
                {renderField(field)}
                {idx < fields.length - 1 && <View className='input-divider' />}
              </View>
            ))}
          </View>

          <View className='submit-section'>
            <View className={`reg-submit-btn${submitting ? ' loading' : ''}`} onClick={handleSubmit}>
              <Text className='reg-submit-text'>{submitting ? 'SUBMITTING...' : 'CONFIRM'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
