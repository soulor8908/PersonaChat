# PersonaChat 部署指南 v2.0

> AI Native 项目 — 部署前先跑 `pnpm trinity`

## 部署前检查

```bash
pnpm trinity
# = pnpm typecheck && pnpm check && pnpm test
# 全部通过后再部署
```

## 1. 后端部署 (Cloudflare Workers)

### 1.1 登录 + 创建 D1

```bash
cd apps/api
npx wrangler login                                  # 首次
npx wrangler d1 create persona-chat-db              # 创建数据库
```

将输出的 `database_id` 填入 `wrangler.toml` 的 `[[d1_databases]]` 段。

### 1.2 初始化数据库

```bash
npx wrangler d1 execute persona-chat-db --file=./schema.sql
```

### 1.3 设置 Secrets

```bash
npx wrangler secret put DEEPSEEK_API_KEY   # DeepSeek (免费)
npx wrangler secret put GLM_API_KEY        # GLM (免费)
npx wrangler secret put OPENAI_API_KEY     # GPT (付费, 可选)
npx wrangler secret put API_KEY            # API 鉴权 (生产必设)
```

### 1.4 设置生产环境变量

```bash
# 生产模式 + CORS 白名单
npx wrangler secret put ALLOWED_ORIGINS    # 逗号分隔, 如 "https://miniprogram.example.com"
npx wrangler deploy --env production
```

### 1.5 验证

```bash
curl https://persona-chat-api.<subdomain>.workers.dev/api/health
curl https://persona-chat-api.<subdomain>.workers.dev/api/models
```

## 2. 微信小程序部署

1. 编辑 `apps/miniprogram/src/api/client.js` 将 `BASE_URL` 改为 Worker 域名
2. 微信公众平台 → 开发设置 → 服务器域名 → 添加 Worker 域名
3. 微信开发者工具 → 上传 → 审核 → 发布

## 3. 更新流程

```bash
pnpm trinity              # 先验证
git tag round-{N}-start   # 打轮次标签
npx wrangler deploy        # 部署
```

## 4. 环境变量速查

| Variable | 用途 | 必填 |
|----------|------|------|
| DEEPSEEK_API_KEY | 免费聊天模型 | 是 |
| GLM_API_KEY | 免费聊天模型 | 是 |
| OPENAI_API_KEY | GPT 模型 | 否 |
| API_KEY | API 鉴权 (x-api-key / Bearer) | 生产必设 |
| ALLOWED_ORIGINS | CORS 白名单 | 生产建议 |

## 5. 安全注意事项

- `wrangler.toml` 不包含任何 secrets
- 所有 API key 通过 `wrangler secret put` 配置
- 生产环境务必设置 API_KEY
- Worker 域名必须添加到微信小程序服务器域名白名单
