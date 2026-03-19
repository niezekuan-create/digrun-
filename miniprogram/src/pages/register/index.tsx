import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { request } from '../../utils/request'
import './index.scss'

interface FieldConfig { key: string; label: string; enabled: boolean; required: boolean }
interface EventDetail { id: number; title: string; form_config?: { fields: FieldConfig[] } }

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

  useLoad(async () => {
    if (!eventId) { Taro.navigateBack(); return }
    try {
      const data = await request<EventDetail>({ url: `/events/${eventId}`, auth: false })
      setEvent(data)
    } catch (e) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
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
          event_id: +eventId!,
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
      // request util already shows a toast for HTTP errors; show fallback for unexpected ones
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

    // Toggle fields (boolean)
    if (['bag_storage', 'supply', 'coffee'].includes(field.key)) {
      return (
        <View key={field.key} className='input-row'>
          <Text className='input-label'>{label}</Text>
          <View
            style={`padding:8rpx 24rpx;border-radius:4rpx;border:1rpx solid ${val ? '#fff' : '#333'};background:${val ? '#fff' : 'transparent'};`}
            onClick={() => setValue(field.key, !val)}
          >
            <Text style={`font-size:24rpx;color:${val ? '#000' : '#555'};`}>{val ? '是' : '否'}</Text>
          </View>
        </View>
      )
    }

    // Pace selector
    if (field.key === 'pace') {
      return (
        <View key={field.key} className='input-row'>
          <Text className='input-label'>{label}</Text>
          <ScrollView scrollX style='flex:1;'>
            <View style='display:flex;gap:12rpx;padding:4rpx 0;'>
              {PACE_OPTIONS.map(p => (
                <View
                  key={p}
                  style={`padding:8rpx 20rpx;border-radius:4rpx;white-space:nowrap;border:1rpx solid ${val === p ? '#fff' : '#333'};background:${val === p ? '#fff' : 'transparent'};flex-shrink:0;`}
                  onClick={() => setValue('pace', val === p ? '' : p)}
                >
                  <Text style={`font-size:22rpx;color:${val === p ? '#000' : '#666'};`}>{p}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )
    }

    // Distance selector
    if (field.key === 'distance') {
      return (
        <View key={field.key} className='input-row'>
          <Text className='input-label'>{label}</Text>
          <View style='display:flex;gap:12rpx;flex-wrap:wrap;flex:1;justify-content:flex-end;'>
            {DISTANCE_OPTIONS.map(d => (
              <View
                key={d}
                style={`padding:8rpx 20rpx;border-radius:4rpx;border:1rpx solid ${val === d ? '#fff' : '#333'};background:${val === d ? '#fff' : 'transparent'};`}
                onClick={() => setValue('distance', val === d ? '' : d)}
              >
                <Text style={`font-size:22rpx;color:${val === d ? '#000' : '#666'};`}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )
    }

    // Default: text input
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
        <View style='flex:1;display:flex;align-items:center;justify-content:center;'>
          <Text style='color:#555;font-size:28rpx;'>加载中...</Text>
        </View>
      </View>
    )
  }

  const fields = getFields()

  return (
    <View className='register-page'>
      <View className='reg-header'>
        <Text className='reg-title'>REGISTER</Text>
        <Text className='reg-sub'>{event.title}</Text>
      </View>

      <ScrollView scrollY className='reg-scroll'>
        <View className='reg-body'>
          <View className='section'>
            <View className='input-group'>
              {fields.map((field, idx) => (
                <View key={field.key}>
                  {renderField(field)}
                  {idx < fields.length - 1 && <View className='input-divider' />}
                </View>
              ))}
            </View>
          </View>

          <View className='submit-section'>
            <View className={`reg-submit-btn ${submitting ? 'loading' : ''}`} onClick={handleSubmit}>
              <Text className='reg-submit-text'>{submitting ? '提交中...' : '确认报名'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
