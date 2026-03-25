# Registrations API

> Base URL: `https://running.dingstock.net`
> Content-Type: `application/json`
> 需要 Authorization: Bearer {token}（登录后获取）

---

## 1. 报名活动

### `POST /registrations`

提交活动报名表单。

#### 请求 Header

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### 请求体（Body）

```json
{
  "activity_id": "act001",
  "name": "张三",
  "phone": "13812345678",
  "pace": "5:00-5:30",
  "size": "M",
  "xhs_link": "https://www.xiaohongshu.com/user/profile/xxx"
}
```

#### 请求字段说明

| 字段          | 类型   | 必填 | 说明                                               |
|-------------|--------|------|----------------------------------------------------|
| `activity_id`| string | 是   | 活动 ID                                            |
| `name`      | string | 是   | 报名人姓名（真实姓名）                              |
| `phone`     | string | 是   | 手机号                                             |
| `pace`      | string | 否   | 配速段位（`4:00以内` / `4:00-4:30` / ... / `6:00以上`）|
| `size`      | string | 条件必填 | 衣服尺码（`XS` / `S` / `M` / `L` / `XL` / `XXL`）；当活动 `requireSize=true` 时必填 |
| `xhs_link`  | string | 条件必填 | 小红书主页链接；当活动 `requireXhs=true` 时必填   |

#### 成功返回（HTTP 201）

```json
{
  "id": "reg_001",
  "activity_id": "act001",
  "user_id": "user_abc",
  "status": "pending",
  "created_at": 1743904800000
}
```

#### 返回字段说明

| 字段          | 类型   | 说明                                             |
|-------------|--------|--------------------------------------------------|
| `id`        | string | 报名记录唯一 ID                                  |
| `activity_id`| string | 活动 ID                                         |
| `user_id`   | string | 报名用户 ID                                      |
| `status`    | string | 报名状态：`pending`（待审核）/ `approved`（已通过）/ `waitlist`（候补）/ `rejected`（已拒绝）|
| `created_at`| number | 报名时间（Unix 毫秒时间戳）                      |

#### 错误返回

| HTTP 状态码 | 场景                   | 示例 message         |
|-----------|------------------------|----------------------|
| 400       | 参数缺失或格式错误       | "phone is required"  |
| 401       | 未登录或 token 无效     | "Unauthorized"       |
| 409       | 已报名，重复提交         | "already registered" |
| 422       | 活动不可报名（已截止等）| "activity not open"  |

---

## 2. 取消报名

### `POST /registrations/:id/cancel`

取消已提交的报名。

#### 路径参数

| 参数 | 类型   | 说明      |
|-----|--------|-----------|
| `id`| string | 报名记录 ID |

#### 成功返回（HTTP 200）

```json
{
  "id": "reg_001",
  "status": "cancelled"
}
```

---

## 3. 获取签到二维码

### `GET /registrations/:id/qrcode`

获取签到用二维码（活动当天出示给管理员扫描）。

#### 路径参数

| 参数 | 类型   | 说明      |
|-----|--------|-----------|
| `id`| string | 报名记录 ID |

#### 成功返回（HTTP 200）

```json
{
  "qrcode": "data:image/png;base64,iVBORw0KGgo...",
  "registration_id": "reg_001",
  "expires_at": 1743990000000
}
```

---

## 报名状态流转图

```
用户提交报名
     │
     ▼
  pending（待审核）
     │
  ┌──┴───────────┐
  ▼              ▼
approved       rejected
（已通过）      （已拒绝）
  │
  ▼
checked_in（已签到，管理员扫码后更新）
```

---

## 候补逻辑

1. 当 `joinCount >= count`（名额满）且 `waitlistCount < maxWaitlist` 时，报名自动进入候补（status=`waitlist`）
2. 有正式名额退出时，服务端按报名时间顺序自动晋升候补名单中第一位
3. 晋升后发送通知（推送或 Taro.showModal）
