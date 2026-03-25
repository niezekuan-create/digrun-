# Activities API

> Base URL: `https://running.dingstock.net`
> Content-Type: `application/json`

---

## 1. 获取活动列表

### `GET /activities/list`

返回指定俱乐部的活动列表（供列表页展示）。

#### 请求参数（Query）

| 参数       | 类型   | 必填 | 说明                     |
|-----------|--------|------|--------------------------|
| `club`    | string | 否   | 俱乐部 ID，过滤该俱乐部活动 |
| `page`    | number | 否   | 页码，从 0 开始，默认 0     |
| `pageSize`| number | 否   | 每页条数，默认 10           |

#### 返回格式

```json
{
  "data": [
    {
      "id": "act001",
      "name": "DIG CITY RUN · 上海站",
      "subtitle": "2025.04.06 · 南京路步行街",
      "posterUrl": "https://cdn.example.com/posters/act001.jpg",
      "appliable": true,
      "applyText": "立即报名",
      "timeStr": "04/06 08:00",
      "route": ""
    }
  ]
}
```

#### 返回字段说明

| 字段        | 类型    | 说明                                            |
|------------|---------|------------------------------------------------|
| `id`       | string  | 活动唯一 ID                                     |
| `name`     | string  | 活动名称                                        |
| `subtitle` | string? | 副标题（日期 + 地点摘要）                        |
| `posterUrl`| string? | 海报图片 URL（3:4 竖版）                        |
| `appliable`| boolean?| 当前是否可报名                                  |
| `applyText`| string? | 报名状态文案（如"立即报名"/"报名已截止"/"名额已满"）|
| `timeStr`  | string? | 活动时间简要描述（前端展示用）                   |
| `route`    | string? | 活动路线外链（GPS/Strava 等）                   |

---

## 2. 获取活动详情

### `GET /activities/detail/:id`

返回单个活动的完整信息（供详情页 + 报名页展示）。

#### 路径参数

| 参数 | 类型   | 说明    |
|-----|--------|---------|
| `id`| string | 活动 ID |

#### 返回格式

```json
{
  "data": {
    "id": "act001",
    "club": {
      "id": "xbc3mQnYPR",
      "name": "DIG RUNNING CLUB",
      "avatar": "https://cdn.example.com/club/avatar.jpg"
    },
    "name": "DIG CITY RUN · 上海站",
    "subtitle": "4 月 6 日，我们在南京路",
    "description": "每一次城市奔跑，都是与这座城市最真实的连接...",
    "start": 1743904800000,
    "end": 1743915600000,
    "applyStart": 1743436800000,
    "applyEnd": 1743854400000,
    "posterUrl": "https://cdn.example.com/posters/act001.jpg",
    "images": [],
    "address": "上海市黄浦区南京路步行街（人民广场地铁站 1 号口）",
    "route": "https://www.strava.com/routes/xxx",
    "detailRoute": "",
    "location": {
      "longitude": 121.473644,
      "latitude": 31.237451
    },
    "city": "上海",
    "province": "上海",
    "count": 100,
    "joinCount": 67,
    "waitlistCount": 5,
    "maxWaitlist": 20,
    "points": 50,
    "joinAvatars": [
      "https://cdn.example.com/avatars/u1.jpg",
      "https://cdn.example.com/avatars/u2.jpg"
    ],
    "appliable": true,
    "applyText": "立即报名",
    "timeStr": "2025/04/06 08:00 - 11:00",
    "btnText": "立即报名",
    "btnStatus": true,
    "memberOnly": false,
    "requireSize": true,
    "requireXhs": false
  }
}
```

#### 返回字段说明

| 字段           | 类型              | 来源字段           | 说明                                           |
|---------------|-------------------|--------------------|------------------------------------------------|
| `id`          | string            | Activity.id        | 活动唯一 ID                                    |
| `club`        | object?           | Activity.club      | 所属俱乐部信息                                 |
| `name`        | string            | Activity.name      | 活动名称                                       |
| `subtitle`    | string?           | Activity.subtitle  | 副标题                                         |
| `description` | string            | Activity.description | 活动详细描述（支持换行符 `\n`）               |
| `start`       | number            | Activity.start     | 活动开始时间（Unix 毫秒时间戳）               |
| `end`         | number            | Activity.end       | 活动结束时间                                   |
| `applyStart`  | number            | Activity.applyStart| 报名开始时间                                   |
| `applyEnd`    | number            | Activity.applyEnd  | 报名截止时间                                   |
| `posterUrl`   | string?           | Activity.posterUrl | 海报图 URL                                     |
| `images`      | string[]?         | Activity.images    | 活动图片数组                                   |
| `address`     | string            | Activity.address   | 活动地址（文字描述）                           |
| `route`       | string?           | Activity.route     | GPS 路线/活动外链（详情页"复制链接"使用）      |
| `detailRoute` | string?           | Activity.detailRoute | 详情路线（备用）                             |
| `location`    | object?           | Activity.location  | 经纬度（可用于地图展示）                       |
| `city`        | string?           | Activity.city      | 城市                                           |
| `province`    | string?           | Activity.province  | 省份                                           |
| `count`       | number            | Activity.count     | 最大报名人数（名额上限）                       |
| `joinCount`   | number            | 计算字段           | 当前已报名人数                                 |
| `waitlistCount`| number           | 计算字段           | 候补人数                                       |
| `maxWaitlist` | number            | Activity.maxWaitlist | 候补上限                                     |
| `points`      | number            | Activity.points    | 完成活动可获得的积分                           |
| `joinAvatars` | string[]          | Activity.joinAvatars | 已报名用户头像数组（最多返回 8 个）          |
| `appliable`   | boolean           | 计算字段           | 当前是否可报名（前端据此控制按钮状态）         |
| `applyText`   | string?           | 计算字段           | 报名状态文案                                   |
| `timeStr`     | string?           | 计算字段           | 时间范围格式化文案                             |
| `btnText`     | string?           | 计算字段           | 底部按钮文案（服务端计算后返回）               |
| `btnStatus`   | boolean           | 计算字段           | 底部按钮是否可点击（true=跳报名页）           |
| `memberOnly`  | boolean?          | Activity.memberOnly | 是否会员专属活动                             |
| `requireSize` | boolean?          | Activity.requireSize | 报名时是否需要填写衣服尺码                  |
| `requireXhs`  | boolean?          | Activity.requireXhs  | 报名时是否需要填写小红书链接                |

#### `btnStatus` / `appliable` 计算规则（服务端逻辑）

| 条件                                     | `appliable` | `btnText`    | `btnStatus` |
|-----------------------------------------|-------------|--------------|-------------|
| 当前时间 < applyStart                   | false       | 报名未开始   | false       |
| applyStart ≤ 当前时间 ≤ applyEnd，且 joinCount < count | true | 立即报名 | true |
| joinCount ≥ count，且 waitlistCount < maxWaitlist | true | 候补报名 | true |
| joinCount ≥ count，且 waitlistCount ≥ maxWaitlist | false | 名额已满 | false |
| 当前时间 > applyEnd                     | false       | 报名已截止   | false       |

---

## Mock 数据

完整 mock 见 `src/utils/mockData.ts`，包含 2 条 LSD 测试活动：

| ID     | 名称                     | 城市 | 距离 | requireSize | requireXhs | memberOnly |
|--------|--------------------------|------|------|-------------|------------|------------|
| lsd001 | DIG LSD · 成都锦江绿道   | 成都 | 30KM | false       | false      | false      |
| lsd002 | DIG LSD · 上海滨江       | 上海 | 10KM | false       | false      | false      |
