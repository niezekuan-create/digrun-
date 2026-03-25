# DIG RUNNING CLUB · API 文档索引

> Base URL: `https://running.dingstock.net`
> 所有接口返回 `Content-Type: application/json`

---

## 文档目录

| 文件 | 说明 |
|------|------|
| [activities.md](./activities.md) | 活动列表 & 详情接口 |
| [registrations.md](./registrations.md) | 活动报名 & 签到接口 |

---

## 认证方式

登录后在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 通过 `POST /auth/wechat/login` 获取（微信手机号一键登录）。

---

## 接口状态总览

| 接口路径 | 方法 | 认证 | 状态 | 说明 |
|---------|------|------|------|------|
| `/activities/list` | GET | 否 | 待实现 | 活动列表（含 mock） |
| `/activities/detail/:id` | GET | 否 | 待实现 | 活动详情（含 mock） |
| `/registrations` | POST | 是 | 待扩展 | 报名（需加 size/xhs_link 字段） |
| `/registrations/:id/cancel` | POST | 是 | 已有 | 取消报名 |
| `/registrations/:id/qrcode` | GET | 是 | 已有 | 签到二维码 |

> **待实现**：前端已在调用，mock 数据可正常运行，等后端接口上线后删除 fallback 逻辑即可。
> **待扩展**：后端接口已有，但需补充 `size`、`xhs_link` 字段的存储与校验。

---

## 数据模型参考

核心模型 `Activity` 字段含义：

```typescript
export class Activity extends Base {
  name: string            // 活动名称
  subtitle?: string       // 副标题
  description: string     // 详情描述

  applyStart: number      // 报名开始时间（Unix ms）
  applyEnd: number        // 报名截止时间（Unix ms）
  appliable: boolean      // 当前是否可报名（服务端计算）

  start: number           // 活动开始时间（Unix ms）
  end: number             // 活动结束时间（Unix ms）

  location?: Location     // 经纬度
  city?: string
  province?: string

  count: number           // 名额上限
  maxWaitlist: number     // 候补上限
  points: number          // 完成可获积分

  address: string         // 文字地址

  club?: Ref<Club>        // 所属俱乐部
  createdBy: Ref<User>    // 创建人

  posterUrl: string       // 海报图 URL（3:4）
  images?: string[]       // 活动图片数组

  joinAvatars: string[]   // 已报名头像（前 8 个）

  route?: string          // GPS 路线外链
  detailRoute?: string    // 详情路线（备用）

  memberOnly?: boolean    // 是否会员专属
  requireSize?: boolean   // 报名是否要填衣服尺码
  requireXhs?: boolean    // 报名是否要填小红书链接

  weight?: number         // 排序权重（越大越靠前）

  auditStatus: AuditStatus // draft | published | offline
}
```

---

## 页面 → 接口 对应关系

```
pages/events/index.tsx
  └── GET /activities/list?club=&page=&pageSize=

pages/events/detail.tsx
  └── GET /activities/detail/:id
  └── [底部按钮] → navigateTo pages/register/index?id=

pages/register/index.tsx
  └── GET /activities/detail/:id  (获取 requireSize/requireXhs)
  └── POST /registrations         (提交报名)
```
