import { cleanText, toDate, toMs, toNumber } from './request'

export type MiniActivityDisplayStatus =
  | 'register_not_started'
  | 'register_open'
  | 'register_closed'
  | 'event_upcoming'
  | 'in_progress'
  | 'ended'
  | 'audit_pending'
  | 'waitlist'
  | 'signup_rejected'
  | 'registered'
  | 'checkin_pending'
  | 'checked_in'

export type ActivityButtonAction = 'signup' | 'checkin' | 'none'

export type ActivityCtaState = {
  text: string
  enabled: boolean
  action: ActivityButtonAction
}

export type ActivityListButtonState = {
  text: string
  canClick: boolean
}

export interface ActivitySummary {
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
  displayStatus?: MiniActivityDisplayStatus | string
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const MINI_ACTIVITY_DISPLAY_STATUS_LABELS: Record<MiniActivityDisplayStatus, string> = {
  register_not_started: '报名未开始',
  register_open: '报名进行中',
  register_closed: '报名已截止',
  event_upcoming: '活动未开始',
  in_progress: '进行中',
  ended: '已结束',
  audit_pending: '等待审核',
  waitlist: '候补中',
  signup_rejected: '报名未通过',
  registered: '已报名，活动未开始',
  checkin_pending: '待签到',
  checked_in: '已签到',
}

const pickString = (value: any, keys: string[]): string | undefined => {
  for (const key of keys) {
    if (typeof value?.[key] === 'string') return cleanText(value[key])
  }
  return undefined
}

const pickBoolean = (value: any, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    if (typeof value?.[key] === 'boolean') return value[key]
  }
  return undefined
}

const pickAvatarUrls = (value: any): string[] => {
  const candidates = [
    value?.joinAvatars,
  ]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const urls = candidate
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return String((item as any).avatar || (item as any).avatarUrl || (item as any).url || '')
        }
        return ''
      })
      .map(cleanText)
      .filter(Boolean)

    if (urls.length > 0) return urls
  }

  return []
}

export const getActivityJoinCount = (value: any): number | undefined => {
  const joinAvatars = pickAvatarUrls(value)
  return (
    (joinAvatars.length > 0 ? joinAvatars.length : undefined) ?? 0
  )
}

export const getActivityCapacity = (value: any): number | undefined =>
  toNumber(value?.count) ?? 0 

export const normalizeActivitySummary = (value: any): ActivitySummary => ({
  id: String(value?.id ?? ''),
  name: cleanText(value?.name ?? value?.title),
  subtitle: pickString(value, ['subtitle']),
  posterUrl: pickString(value, ['posterUrl', 'poster_url']),
  appliable: pickBoolean(value, ['appliable', 'applicable']),
  applyText: pickString(value, ['applyText', 'apply_text']),
  timeStr: pickString(value, ['timeStr', 'time_str']),
  address: pickString(value, ['address']),
  city: pickString(value, ['city']),
  start: toMs(value?.start),
  joinCount: getActivityJoinCount(value),
  count: getActivityCapacity(value),
  displayStatus: pickString(value, ['displayStatus', 'display_status']),
})

export const normalizeActivityDetail = <T extends Record<string, any>>(value: any): T | null => {
  if (!value || typeof value !== 'object') return null

  return {
    ...(value as T),
    joinCount: getActivityJoinCount(value),
  }
}

export const buildActivitiesUrl = (clubId: string, status: string) => {
  const params = [
    'page=0',
    'pageSize=20',
    `club=${encodeURIComponent(clubId)}`,
    `statuses=${encodeURIComponent(status)}`,
  ]
  return `/api/mini/activities/list?${params.join('&')}`
}

export const dedupeActivities = <T extends { id?: string | number }>(list: T[]) => {
  const seen = new Set<string>()
  return list.filter((item) => {
    const id = String(item?.id ?? '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export const formatDate = (date: Date) =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`

export const formatTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export const formatDateShort = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

export const formatActivityStart = (timestamp?: number) => {
  if (!timestamp) return { mmdd: '—', weekday: '' }
  const date = new Date(timestamp)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return { mmdd: `${mm}.${dd}`, weekday: WEEKDAYS[date.getDay()] }
}

export const parseActivityDistance = (address?: string) => {
  if (!address) return ''
  const match = address.match(/(\d+\.?\d*)\s*[Kk][Mm]/)
  return match ? match[0].toUpperCase() : ''
}

export const getActivityTimeRange = (
  activity: { timeStr?: string },
  startDate: Date | null,
  endDate: Date | null,
) => {
  if (!startDate) return activity.timeStr || ''
  if (!endDate) return `${formatDateShort(startDate)} ${formatTime(startDate)}`

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()

  if (sameDay) return `${formatTime(startDate)} — ${formatTime(endDate)}`
  return `${formatDateShort(startDate)} ${formatTime(startDate)} — ${formatDateShort(endDate)} ${formatTime(endDate)}`
}

export const getActivityApplyRange = (
  activity: { applyText?: string },
  applyStartDate: Date | null,
  applyEndDate: Date | null,
) => {
  if (applyStartDate && applyEndDate) {
    return `${formatDate(applyStartDate)} ${formatTime(applyStartDate)} — ${formatDate(applyEndDate)} ${formatTime(applyEndDate)}`
  }
  return activity.applyText || ''
}

export const getActivityListButtonState = (activity: ActivitySummary): ActivityListButtonState => {
  const rawStatus = typeof activity.displayStatus === 'string' ? activity.displayStatus.trim().toLowerCase() : ''
  const status = rawStatus as MiniActivityDisplayStatus
  const hasMappedStatus = rawStatus && Object.prototype.hasOwnProperty.call(MINI_ACTIVITY_DISPLAY_STATUS_LABELS, status)
  const canClick = hasMappedStatus ? status === 'register_open' || status === 'waitlist' : !!activity.appliable
  const text = hasMappedStatus
    ? MINI_ACTIVITY_DISPLAY_STATUS_LABELS[status]
    : activity.appliable
      ? '立即报名'
      : activity.applyText || '已截止'

  return { canClick, text }
}

export const getActivityCtaState = (activity: {
  displayStatus?: string
  isSignedUp?: boolean
  isChecked?: boolean
  btnText?: string
  btnStatus?: boolean
  applyStart?: any
  applyEnd?: any
  start?: any
  end?: any
  appliable?: boolean
  applyText?: string
}): ActivityCtaState => {
  const rawStatus = typeof activity.displayStatus === 'string' ? activity.displayStatus.trim().toLowerCase() : ''
  const status = rawStatus as MiniActivityDisplayStatus
  const isSignedUp = !!activity.isSignedUp
  const isChecked = !!activity.isChecked

  if (rawStatus && Object.prototype.hasOwnProperty.call(MINI_ACTIVITY_DISPLAY_STATUS_LABELS, status)) {
    if (status === 'checkin_pending') return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.checkin_pending, enabled: true, action: 'checkin' }
    if (status === 'checked_in') return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.checked_in, enabled: false, action: 'none' }
    if (status === 'register_open') {
      if (isSignedUp) return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.registered, enabled: false, action: 'none' }
      return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.register_open, enabled: true, action: 'signup' }
    }
    if (status === 'waitlist') {
      if (isSignedUp) return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.registered, enabled: false, action: 'none' }
      return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.waitlist, enabled: true, action: 'signup' }
    }
    if (status === 'in_progress') {
      if (isChecked) return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.checked_in, enabled: false, action: 'none' }
      if (isSignedUp) return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.checkin_pending, enabled: true, action: 'checkin' }
      return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS.in_progress, enabled: false, action: 'none' }
    }
    return { text: MINI_ACTIVITY_DISPLAY_STATUS_LABELS[status], enabled: false, action: 'none' }
  }

  if (typeof activity.btnText === 'string' || typeof activity.btnStatus === 'boolean') {
    const enabled = !!activity.btnStatus
    const text = String(activity.btnText || activity.applyText || (enabled ? '报名' : '已截止'))
    return { text, enabled, action: enabled ? 'signup' : 'none' }
  }

  const now = Date.now()
  const applyStart = toMs(activity.applyStart)
  const applyEnd = toMs(activity.applyEnd)
  const start = toMs(activity.start)
  const end = toMs(activity.end)

  if (end !== undefined && now > end) return { text: '已结束', enabled: false, action: 'none' }

  if (start !== undefined && end !== undefined && now >= start && now <= end) {
    if (isChecked) return { text: '已签到', enabled: false, action: 'none' }
    if (isSignedUp) return { text: '签到', enabled: true, action: 'checkin' }
    return { text: '未报名', enabled: false, action: 'none' }
  }

  if (applyStart !== undefined && now < applyStart) return { text: '未开始', enabled: false, action: 'none' }

  const inApplyWindow =
    applyStart !== undefined && applyEnd !== undefined ? now >= applyStart && now <= applyEnd : undefined

  if (inApplyWindow !== false) {
    if (isSignedUp) return { text: '已报名', enabled: false, action: 'none' }
    if (activity.appliable) return { text: '报名', enabled: true, action: 'signup' }
    return { text: activity.applyText || '已截止', enabled: false, action: 'none' }
  }

  if (isSignedUp) return { text: '已报名', enabled: false, action: 'none' }
  return { text: activity.applyText || '已截止', enabled: false, action: 'none' }
}

export const getActivityDates = (activity: {
  start?: any
  end?: any
  applyStart?: any
  applyEnd?: any
}) => ({
  startDate: toDate(activity.start),
  endDate: toDate(activity.end),
  applyStartDate: toDate(activity.applyStart),
  applyEndDate: toDate(activity.applyEnd),
})
