# PersonaChat 部署指南

## 架构概览

```
┌─────────────────────┐     ┌──────────────────────────────┐
│  微信小程序前端      │────▶│  Cloudflare Workers API      │
│  (apps/miniprogram)  │     │  (apps/api → Hono + tRPC)   │
└─────────────────────┘     │         │                     │
                            │    ┌────▼─────┐               │
                            │    │  D1 DB   │               │
                            │    │ (SQLite) │               │
                            │    └──────────┘               │
                            └──────────────────────────────┘
```

---

## 1. 后端部署 (Cloudflare Workers)

### 1.0 一键部署（推荐）

```bash
# 1. 登录 Cloudflare（仅首次，会打开浏览器）
npx wrangler login

# 2. 运行一键部署脚本
pnpm release
```

脚本会自动完成：创建 D1 数据库 → 初始化表 → 提示设置 API Key → 部署 Worker。

### 1.1 手动部署（可选）

```bash
# 安装 wrangler CLI
npm install -g wrangler

# 登录 Cloudflare 账号
wrangler login
```

### 1.2 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create persona-chat-db

# 输出示例：
# ✅ Successfully created DB 'persona-chat-db'
# [[d1_databases]]
# binding = "DB"
# database_name = "persona-chat-db"
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

将输出的 `database_id` 填入 `apps/api/wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "persona-chat-db"
database_id = "xxxx-xxxx-xxxx-xxxx"  # ← 替换为实际 ID
```

### 1.3 初始化数据库表

```bash
cd apps/api
wrangler d1 execute persona-chat-db --file=./schema.sql

# 验证
wrangler d1 execute persona-chat-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 1.4 设置环境变量 (API Keys)

```bash
# DeepSeek API Key（内置免费模型）
wrangler secret put DEEPSEEK_API_KEY

# GLM API Key（内置免费模型）
wrangler secret put GLM_API_KEY
```

### 1.5 部署 Worker

```bash
cd apps/api

# 开发环境本地预览
pnpm dev
# → http://localhost:8787

# 生产部署
pnpm release
# → https://persona-chat-api.<your-subdomain>.workers.dev
```

### 1.6 验证部署

```bash
curl https://persona-chat-api.<your-subdomain>.workers.dev/api/health
# → {"ok":true,"ts":1712345678901}
```

---

## 2. 后端更新流程

```bash
# 修改代码后
cd apps/api
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
pnpm release       # 部署

# 数据库变更
wrangler d1 execute persona-chat-db --file=./migrations/<name>.sql
```

---

## 3. 微信小程序部署

### 3.1 配置 API 域名

编辑 `apps/miniprogram/src/api/client.js`：

```js
// 开发环境用相对路径（微信开发者工具勾选"不校验域名"）
const BASE_URL = ''

// 生产环境改为你的 Worker 域名
// const BASE_URL = 'https://persona-chat-api.<your-subdomain>.workers.dev'
```

> 微信小程序要求：生产环境必须使用 **HTTPS** 且域名已在微信公众平台配置白名单。

### 3.2 打开微信开发者工具

1. 打开微信开发者工具
2. 项目目录选择：`PersonaChat/apps/miniprogram`
3. 填入小程序的 AppID

### 3.3 上传 & 发布

```
在微信开发者工具中:
1. 工具栏 → 上传
2. 填写版本号 (如 2.0.0)
3. 填写更新说明
4. 登录微信公众平台 → 版本管理 → 提交审核 → 发布
```

---

## 4. 完整发布流程 (速查)

```bash
# ── 第 1 步：后端 ──
cd apps/api
wrangler d1 execute persona-chat-db --file=./schema.sql    # 首次建表
wrangler secret put DEEPSEEK_API_KEY                        # 设置密钥
pnpm release                                                  # 部署 Worker

# ── 第 2 步：前端 ──
# 编辑 apps/miniprogram/src/api/client.js 将 BASE_URL 设为 Worker 域名
# 微信开发者工具 → 上传 → 提交审核 → 发布
```

---

## 5. 常见问题

### Q: wrangler deploy 报 "No such module"
确保 `wrangler.toml` 中 `main` 路径正确指向 `apps/api/src/server.ts`。

### Q: D1 数据库需要迁移怎么办
D1 不支持自动迁移。手动编写迁移 SQL 放在 `apps/api/migrations/` 下，用 `wrangler d1 execute` 执行。

### Q: 小程序请求报 403/404
- 检查 `BASE_URL` 是否配置正确
- 检查 Worker 域名是否在微信公众平台 → 开发 → 开发设置 → 服务器域名中已添加

### Q: 内置模型需要 API Key
必须设置 `DEEPSEEK_API_KEY` 或 `GLM_API_KEY` 环境变量，否则聊天接口会返回 401。
