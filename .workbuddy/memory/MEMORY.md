# PersonaChat 项目记忆

## 项目状态 (2026-07-06)

- **版本**: v2.0.0
- **轮次**: Round 1-12 全部完成 + P0 测试覆盖
- **trinity**: Typecheck ✅ | check-rules 16/16 ✅ | Tests **319/319** ✅
- **测试覆盖**: domain(92) + middleware(40) + service(56) + router(45) + contracts(11) + web(46) + e2e(2) + other(27) = 319

## 架构约定

- Hono + Cloudflare Workers + D1 (后端) + 微信小程序 (前端)
- pnpm workspace monorepo, Zod SSOT contracts 共享层
- 四层架构: domain → repository → service → router (单向依赖)
- AI-005: 禁止硬编码可变集合，用 contracts SSOT 派生
- 文件 ≤ 300 行/文件，禁用 any 类型
- 所有路由入口 Zod.parse() 输入校验

## Round 7 新增能力 (AI Native 深度体验)

1. **流式输出**: POST /api/chats/stream (SSE) + 小程序 enableChunked
2. **对话分支**: chat_records.parent_record_id + branch_index, GET /api/chats/branches
3. **评价反馈**: PUT /api/chats/:id/rate + GET /api/personas/:id/stats
4. **人格记忆**: persona_memories 表 + 异步提取/注入
5. **LLM 可观测**: llm_call_logs + GET /api/admin/metrics

## Round 8 新增能力 (人格市场 + 工坊)

1. **人格排行**: GET /api/personas 支持 sort=popular/recent/rated, LEFT JOIN 聚合 likeRate
2. **热门推荐**: GET /api/personas/hot TOP 10, 首页横滚展示
3. **人格工坊**: POST /api/personas/preview 即时预览 + create 页面 + 一键发布
4. **文件拆分**: chat-svc.ts → chat-helpers.ts (saveRecordAsync + extractMemoriesAsync, 保持 ≤300 行)

## Round 9 新增能力 (Tool Use / Function Calling)

1. **工具注册表**: contracts/tool.ts SSOT — calculator/current_time/web_search 三种工具
2. **Tool Use 循环**: chat-svc while loop 最多 5 轮，LLM tool_calls → 执行 → 结果注入
3. **安全工具执行**: calculator 沙箱 Function / current_time Intl / web_search Brave API
4. **Persona 工具声明**: personas 表 tools 字段，Persona 创建时选择可用工具
5. **流式工具事件**: SSE tool_start/tool_args/tool_end 事件，前端展示 🔧

## 待办 (未来 Round)

- Round 10: Web 客户端 + PWA
- 用户系统 + 鉴权: SEC-001 当前为 advisory
- 生产环境加固: rate-limit → KV, 凭据 → Secrets
