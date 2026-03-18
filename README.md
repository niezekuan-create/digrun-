# DIG RUNNING CLUB

## 项目目标

开发一个 DIG RUNNING CLUB 微信小程序，用于管理跑团活动、报名、签到、跑者数据和排行榜。小程序同时作为未来 DIG RUN APP 的入口端，需要从架构层面支持未来数据打通。

## MVP 功能范围

- 用户登录
- 活动列表
- 活动报名
- 签到二维码
- 扫码签到
- 排行榜
- 后台管理

## 技术架构

- **前端**: Taro + React (微信小程序)
- **后端**: NestJS (Node.js)
- **数据库**: PostgreSQL
- **缓存**: Redis

## 目录结构

- `backend`: 后端服务 (NestJS)
- `miniprogram`: 小程序前端 (Taro + React)

## 快速开始

### 后端 (Backend)

1. 进入后端目录:
   ```bash
   cd backend
   ```
2. 安装依赖 (如果尚未安装):
   ```bash
   npm install
   ```
3. 配置数据库:
   - 确保本地运行 PostgreSQL
   - 修改 `src/app.module.ts` 中的数据库配置 (默认: localhost:5432, user: postgres, pass: password, db: digrun)
4. 启动服务:
   ```bash
   npm run start:dev
   ```

### 小程序 (Miniprogram)

1. 进入小程序目录:
   ```bash
   cd miniprogram
   ```
2. 安装依赖 (如果尚未安装):
   ```bash
   npm install
   ```
3. 启动开发环境 (微信小程序):
   ```bash
   npm run dev:weapp
   ```
4. 使用微信开发者工具打开 `miniprogram/dist` 目录。

## 开发进度

- [x] 初始化项目结构
- [x] 初始化后端 (NestJS)
- [x] 初始化前端 (Taro)
- [x] 创建后端模块 (Users, Events, Registrations)
- [x] 定义数据库实体 (User, Event, Registration)
- [ ] 完成前端页面开发
- [ ] 联调前后端接口
