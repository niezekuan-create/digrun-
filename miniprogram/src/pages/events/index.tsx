import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useRef } from 'react'
import { request, CLUB_ID_CONFIG } from '../../utils/request'
import { getMockActivitiesList } from '../../utils/mockData'
import BottomNav from '../../components/BottomNav/index'
import './index.scss'
declare const IMG_VERSION: string

type TabKey = 'upcoming' | 'ended'

interface Activity {
  id: string
  name: string
  subtitle?: string
  posterUrl?: string
  appliable?: boolean
  applyText?: string
  timeStr?: string
  address?: string
  city?: string
  start?: number
  joinCount?: number
  count?: number
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const formatStart = (ts?: number) => {
  if (!ts) return { mmdd: '—', weekday: '' }
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { mmdd: `${mm}.${dd}`, weekday: WEEKDAYS[d.getDay()] }
}

const parseDistance = (address?: string) => {
  if (!address) return ''
  const m = address.match(/(\d+\.?\d*)\s*[Kk][Mm]/)
  return m ? m[0].toUpperCase() : ''
}

export default function EventsPage() {
  const [tab, setTab] = useState<TabKey>('upcoming')
  const [upcoming, setUpcoming] = useState<Activity[]>([])
  const [ended, setEnded] = useState<Activity[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingEnded, setLoadingEnded] = useState(false)
  const loadedEnded = useRef(false)
  const clubId = CLUB_ID_CONFIG

  useLoad(() => { loadTab('upcoming') })

  const toMs = (v: any): number | undefined => {
    const n = typeof v === 'string' ? Number(v) : v
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return undefined
    return n < 1e12 ? n * 1000 : n
  }

  const normalizeActivity = (v: any): Activity => {
    const pickAvatars = (arr: any): string[] => {
      if (!Array.isArray(arr)) return []
      return arr
        .map((it) => {
          if (typeof it === 'string') return it
          if (it && typeof it === 'object') return String((it as any).avatar || (it as any).avatarUrl || (it as any).url || '')
          return ''
        })
        .map((s) => String(s || '').trim())
        .filter(Boolean)
    }

    const joinAvatars = (() => {
      const candidates = [
        v?.joinAvatars,
        v?.join_avatars,
        v?.joinAvatarUrls,
        v?.join_avatar_urls,
        v?.avatars,
        v?.participants,
        v?.joinUsers,
        v?.join_users,
      ]
      for (const c of candidates) {
        const list = pickAvatars(c)
        if (list.length > 0) return list
      }
      return []
    })()

    const countRaw =
      v?.count ??
      v?.maxPeople ??
      v?.max_people ??
      v?.capacity ??
      v?.maxCount ??
      v?.max_count

    const toNum = (x: any): number | undefined => {
      if (typeof x === 'number') return Number.isFinite(x) ? x : undefined
      if (typeof x === 'string' && x.trim()) {
        const n = Number(x)
        return Number.isFinite(n) ? n : undefined
      }
      return undefined
    }

    const joinCountRaw =
      v?.joinCount ??
      v?.join_count ??
      v?.joinedCount ??
      v?.joined_count ??
      v?.registrationCount ??
      v?.registration_count ??
      v?.participantsCount ??
      v?.participants_count

    return {
      id: String(v?.id ?? ''),
      name: String(v?.name ?? v?.title ?? '').trim(),
      subtitle: typeof v?.subtitle === 'string' ? v.subtitle : undefined,
      posterUrl: typeof v?.posterUrl === 'string' ? v.posterUrl : (typeof v?.poster_url === 'string' ? v.poster_url : undefined),
      appliable: typeof v?.appliable === 'boolean' ? v.appliable : (typeof v?.applicable === 'boolean' ? v.applicable : undefined),
      applyText: typeof v?.applyText === 'string' ? v.applyText : (typeof v?.apply_text === 'string' ? v.apply_text : undefined),
      timeStr: typeof v?.timeStr === 'string' ? v.timeStr : (typeof v?.time_str === 'string' ? v.time_str : undefined),
      address: typeof v?.address === 'string' ? v.address : undefined,
      city: typeof v?.city === 'string' ? v.city : undefined,
      start: toMs(v?.start),
      joinCount: joinAvatars.length > 0 ? joinAvatars.length : toNum(joinCountRaw),
      count: toNum(countRaw),
    }
  }

  const loadTab = async (t: TabKey) => {
    if (t === 'ended' && loadedEnded.current) return
    if (t === 'ended') setLoadingEnded(true)

    try {
      const res = await request<{ data: any[] }>({
        url:
          t === 'ended'
            ? `/api/mini/activities/list?page=0&pageSize=20&statuses=offline&club=${clubId}`
            : `/api/mini/activities/list?page=0&pageSize=20&statuses=inprogress&statuses=upcoming&club=${clubId}`,
      })
      const data = (res?.data || []).map(normalizeActivity).filter((it) => !!it.id)
      if (t === 'upcoming') setUpcoming(data)
      else setEnded(data)
    } catch {
      const data = getMockActivitiesList(clubId, t).data as Activity[]
      if (t === 'upcoming') setUpcoming(data)
      else setEnded(data)
    } finally {
      if (t === 'upcoming') setLoadingUpcoming(false)
      else { setLoadingEnded(false); loadedEnded.current = true }
    }
  }

  const switchTab = (t: TabKey) => {
    if (t === tab) return
    setTab(t)
    loadTab(t)
  }

  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    const u = url.trim().replace(/^`+|`+$/g, '')
    if (!u) return ''
    const withParam = (raw: string, key: string, value: string) => {
      const re = new RegExp(`([?&])${key}=`)
      if (re.test(raw)) return raw
      return `${raw}${raw.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`
    }
    const isOss = /(\.oss-|\.aliyuncs\.com|dingstock)/i.test(u)
    if (isOss && !/[?&]x-oss-process=/i.test(u)) {
      const next = `${u}${u.includes('?') ? '&' : '?'}x-oss-process=image%2Fformat%2Cjpg`
      return withParam(next, 'v', IMG_VERSION || '1')
    }
    if (/\.(heic|heif)(\?|#|$)/i.test(u) && !/[?&]x-oss-process=/i.test(u)) {
      const next = `${u}${u.includes('?') ? '&' : '?'}x-oss-process=image%2Fformat%2Cjpg`
      return withParam(next, 'v', IMG_VERSION || '1')
    }
    return u
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/events/detail?activityId=${id}` })
  }

  const renderCard = (activity: Activity, isEnded: boolean) => {
    const poster = normalizeUrl(activity.posterUrl)
    const { mmdd, weekday } = formatStart(activity.start)
    const distance = parseDistance(activity.address)

    return (
      <View key={activity.id} className={`event-item${isEnded ? ' event-item-ended' : ''}`} onClick={() => goDetail(activity.id)}>

        {/* 海报 */}
        <View className='event-poster-wrap'>
          {poster ? (
            <Image src={poster} className='event-poster' mode='aspectFill' lazyLoad />
          ) : (
            <View className='event-poster placeholder' />
          )}
          {isEnded && <View className='poster-ended-mask'><Text className='poster-ended-text'>已结束</Text></View>}
        </View>

        {/* 信息 */}
        <View className='event-info'>
          <View className='info-title-row'>
            <View className='info-title-block'>
              <Text className='info-name'>{activity.name}</Text>
              {!!activity.subtitle && (
                <Text className='info-subtitle'>{activity.subtitle}</Text>
              )}
            </View>
          </View>

          <View className='info-meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>DATE</Text>
              <Text className='meta-value'>{mmdd}</Text>
              {!!weekday && <Text className='meta-sub'>{weekday}</Text>}
            </View>

            <View className='meta-divider' />

            <View className='meta-item flex-2'>
              <Text className='meta-label'>LOCATION</Text>
              <Text className='meta-value' numberOfLines={1}>{activity.city || '—'}</Text>
              {!!activity.address && (
                <Text className='meta-sub' numberOfLines={1}>{activity.address}</Text>
              )}
            </View>

            {!!distance && <View className='meta-divider' />}
            {!!distance && (
              <View className='meta-item'>
                <Text className='meta-label'>DIST</Text>
                <Text className='meta-value'>{distance}</Text>
              </View>
            )}
          </View>

          <View className='info-footer'>
            {!isEnded && (
              <View
                className={`footer-btn${!activity.appliable ? ' disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (activity.appliable) goDetail(activity.id)
                }}
              >
                <Text className='footer-btn-text'>
                  {activity.appliable ? '立即报名' : (activity.applyText || '已截止')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  const activities = tab === 'upcoming' ? upcoming : ended
  const loading = tab === 'upcoming' ? loadingUpcoming : loadingEnded

  return (
    <View className='events-page'>
      <View className='events-header'>
        <Text className='events-title'>EVENTS</Text>
        <View className='events-tabs'>
          <View className={`events-tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => switchTab('upcoming')}>
            <Text className='events-tab-text'>即将开始</Text>
          </View>
          <View className={`events-tab${tab === 'ended' ? ' active' : ''}`} onClick={() => switchTab('ended')}>
            <Text className='events-tab-text'>已结束</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className='loading'>
          <Text className='loading-text'>LOADING...</Text>
        </View>
      ) : activities.length === 0 ? (
        <View className='loading'>
          <Text className='loading-text'>暂无活动</Text>
        </View>
      ) : (
        <ScrollView scrollY className='events-scroll'>
          {activities.map(a => renderCard(a, tab === 'ended'))}
          <View className='scroll-spacer' />
        </ScrollView>
      )}
      <BottomNav current='events' />
    </View>
  )
}
