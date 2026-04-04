/**
 * Mock 数据 — 基于 Activity 模型
 * 接口文档见 doc/api/activities.md
 */

import type { ActivitySummary, MiniActivityDisplayStatus } from './activity'

// 本地测试图片（真实接口上线后改为 CDN URL）
const LSD1 = require('../assets/images/splash.jpg')
const LSD2 = require('../assets/images/logo.png')

// 时间基准（以当前运行时间计算）
const now = () => Date.now()
const DAY = 86400000

export interface MockActivity extends ActivitySummary {}

export interface MockActivityDetail {
  id: string
  club?: { id: string; name: string; avatar?: string }
  name: string
  subtitle?: string
  description?: string
  start?: number
  end?: number
  applyStart?: number
  applyEnd?: number
  posterUrl?: string
  images?: string[]
  address?: string
  route?: string
  detailRoute?: string
  location?: { longitude: number | null; latitude: number | null }
  city?: string
  province?: string
  count?: number
  joinCount?: number
  waitlistCount?: number
  maxWaitlist?: number
  points?: number
  joinAvatars?: string[]
  appliable?: boolean
  applyText?: string
  timeStr?: string
  btnText?: string
  btnStatus?: boolean
  memberOnly?: boolean
  requireSize?: boolean
  requireXhs?: boolean
  displayStatus?: MiniActivityDisplayStatus | string
}

const MOCK_CLUB = { id: 'xbc3mQnYPR', name: 'DIG RUNNING CLUB', avatar: '' }

const ALL_MOCK_ACTIVITIES: MockActivity[] = [
  {
    id: 'lsd001',
    name: 'DRC LSD RUN Vol.1',
    subtitle: 'Long Slow Distance',
    posterUrl: LSD1,
    appliable: true,
    applyText: '立即报名',
    timeStr: '03/28 08:00',
    address: '东湖公园南门 · 锦江沿线 30KM',
    city: '成都',
    start: now() + 3 * DAY,
    joinCount: 12,
    count: 30,
    displayStatus: 'register_open',
  },
  {
    id: 'lsd002',
    name: 'DRC LSD RUN Vol.2',
    subtitle: 'Long Slow Distance',
    posterUrl: LSD2,
    appliable: true,
    applyText: '立即报名',
    timeStr: '04/05 08:00',
    address: '滨江公园 · 黄浦江沿线 10KM',
    city: '上海',
    start: now() + 11 * DAY,
    joinCount: 5,
    count: 30,
    displayStatus: 'register_open',
  },
  {
    id: 'lsd000',
    name: 'DRC LSD RUN Vol.0',
    subtitle: 'Long Slow Distance',
    posterUrl: LSD1,
    appliable: false,
    applyText: '已结束',
    timeStr: '03/15 08:00',
    address: '东湖公园南门 · 锦江沿线 30KM',
    city: '成都',
    start: now() - 10 * DAY,
    joinCount: 28,
    count: 30,
    displayStatus: 'ended',
  },
]

const MOCK_ACTIVITY_MAP: Record<string, MockActivity> = Object.fromEntries(
  ALL_MOCK_ACTIVITIES.map((activity) => [activity.id, activity]),
)

const createMockActivityDetail = (
  activityId: string,
  overrides: Partial<Omit<MockActivityDetail, 'id' | 'club'>>,
): MockActivityDetail => {
  const summary = MOCK_ACTIVITY_MAP[activityId]
  return {
    ...(summary || { id: activityId, name: '活动' }),
    club: MOCK_CLUB,
    ...overrides,
  }
}

// ── 列表 ──────────────────────────────────────────────────
export const getMockActivitiesList = (_clubId?: string, status?: 'upcoming' | 'ended'): { data: MockActivity[] } => {
  const n = now()
  const filtered = status === 'ended'
    ? ALL_MOCK_ACTIVITIES.filter(a => a.start !== undefined && a.start < n)
    : status === 'upcoming'
    ? ALL_MOCK_ACTIVITIES.filter(a => a.start === undefined || a.start >= n)
    : ALL_MOCK_ACTIVITIES
  return { data: filtered }
}

// ── 详情 ──────────────────────────────────────────────────
const DETAIL_MAP: Record<string, MockActivityDetail> = {
  lsd001: createMockActivityDetail('lsd001', {
    description:
      'LSD（Long Slow Distance）是跑步训练中最基础也最重要的训练方式。\n\n以轻松配速完成长距离跑，提升有氧基础，让身体在低强度下适应长时间运动。\n\n本次路线沿锦江滨河绿道展开，全程 30KM，沿途风景优美，补给充足。完成活动可获得积分奖励。',
    start: now() + 3 * DAY,
    end: now() + 3 * DAY + 4 * 3600000,
    applyStart: now() - DAY,
    applyEnd: now() + DAY,
    province: '四川',
    location: { longitude: 104.0817, latitude: 30.6599 },
    waitlistCount: 0,
    maxWaitlist: 10,
    points: 10,
    joinAvatars: [],
    appliable: true,
    applyText: '立即报名',
    btnText: '立即报名',
    btnStatus: true,
    memberOnly: false,
    requireSize: false,
    requireXhs: false,
  }),
  lsd002: createMockActivityDetail('lsd002', {
    description:
      'DRC LSD RUN 第二站来到上海滨江。\n\n沿黄浦江滨江跑道展开，全程 10KM，适合所有配速的跑者参与。\n\n活动结束后在集合点进行拉伸和分享，欢迎带上你的跑步故事。完成活动可获得积分奖励。',
    start: now() + 11 * DAY,
    end: now() + 11 * DAY + 2 * 3600000,
    applyStart: now() - DAY,
    applyEnd: now() + 8 * DAY,
    province: '上海',
    location: { longitude: 121.4737, latitude: 31.2304 },
    waitlistCount: 0,
    maxWaitlist: 10,
    points: 10,
    joinAvatars: [],
    appliable: true,
    applyText: '立即报名',
    btnText: '立即报名',
    btnStatus: true,
    memberOnly: false,
    requireSize: false,
    requireXhs: false,
  }),
  lsd000: createMockActivityDetail('lsd000', {
    description:
      '这是一次已经结束的 LSD 训练活动，用于覆盖活动详情页在已结束状态下的展示逻辑。',
    start: now() - 10 * DAY,
    end: now() - 10 * DAY + 3 * 3600000,
    applyStart: now() - 15 * DAY,
    applyEnd: now() - 11 * DAY,
    province: '四川',
    location: { longitude: 104.0817, latitude: 30.6599 },
    waitlistCount: 0,
    maxWaitlist: 10,
    points: 10,
    joinAvatars: [],
    btnText: '已结束',
    btnStatus: false,
    memberOnly: false,
    requireSize: false,
    requireXhs: false,
  }),
}

export const getMockActivityDetail = (id: string): { data: MockActivityDetail } | null => {
  const d = DETAIL_MAP[id]
  return d ? { data: d } : null
}

// ── Admin 格式 mock（对应 AdminEvent 接口）────────────────
const toIso = (ts: number) => new Date(ts).toISOString()

export const getMockAdminEvents = () => {
  const n = Date.now()
  const D = 86400000
  return [
    {
      id: 9001,
      title: 'DRC LSD RUN Vol.1',
      date: toIso(n + 3 * D),
      is_active: true,
      status: 'published',
      registration_count: 12,
      location: '东湖公园南门 · 锦江沿线 30KM',
      route: '30KM',
      description: 'LSD（Long Slow Distance）是跑步训练中最基础也最重要的训练方式。\n\n本次路线沿锦江滨河绿道展开，全程 30KM。',
      max_people: 30,
      cover_image: '',
      signup_start_time: toIso(n - D),
      signup_end_time:   toIso(n + D),
      event_start_time:  toIso(n + 3 * D),
      event_end_time:    toIso(n + 3 * D + 4 * 3600000),
    },
    {
      id: 9002,
      title: 'DRC LSD RUN Vol.2',
      date: toIso(n + 11 * D),
      is_active: true,
      status: 'published',
      registration_count: 5,
      location: '滨江公园 · 黄浦江沿线 10KM',
      route: '10KM',
      description: 'DRC LSD RUN 第二站来到上海滨江，全程 10KM。',
      max_people: 30,
      cover_image: '',
      signup_start_time: toIso(n - D),
      signup_end_time:   toIso(n + 8 * D),
      event_start_time:  toIso(n + 11 * D),
      event_end_time:    toIso(n + 11 * D + 2 * 3600000),
    },
  ]
}
