# PersonaChat 项目上下文快照
> 生成日期: 2026-07-06 | 最近轮次: Round 12 | 文档索引: docs/INDEX.md

## 项目概览

| 指标 | 数值 |
|------|------|
| 规则 | 24 条 |
| - ai-behavior | 7 |
| - architecture | 3 |
| - coding | 4 |
| - frontend | 2 |
| - meta | 5 |
| - security | 3 |
| 契约 Schema | 5 个 |
| API 路由 | 18 条 |
| API 源文件 | 21 个 |
| Spec 文档 | 7 个 |
| E2E 测试 | 3 个 |
| 全部测试文件 | 9 个（含 R12 新增 App.test.tsx 34 测试） |
| CI | 已配置（含 R12 G0 machine-enforced） |
| 文档（含 INDEX） | 50+ 个 |

## 架构速查

```
apps/miniprogram   (微信小程序 — 只通过 HTTP API 通信)
       │
       ▼
apps/api/src/router/      ← Hono 路由层 (Zod 输入校验)
apps/api/src/service/     ← 业务逻辑层
apps/api/src/repository/  ← 数据访问层 (D1)
apps/api/src/domain/      ← 纯函数领域逻辑
apps/api/src/middleware/  ← 横切关注点 (cors, error, auth, rate-limit, body-limit, security-headers)

apps/web                  (React 18 + Vite 5 + Tailwind — PWA SPA, 复用 contracts)
   ├── components/        ← R12 新增 ThemeProvider/Skeleton/EmptyState/Card/ThemeToggle
   ├── pages/             ← 5 页面 (Home/Chat/Create/History/Profile) — R12 双主题适配
   └── test/App.test.tsx  ← R12 新增 34 测试 (token/主题/8 处修复)

packages/contracts/  ← Zod SSOT 契约层 (前后端共享)
```

**依赖方向**: domain ↚ repository/service/router（禁止反向）
**契约层**: 只依赖 zod + typescript + vitest（ARCH-002）
**前端隔离**: 小程序只通过 API 通信，不 import 后端模块（ARCH-003）

## 规则速查

| 规则 | 标题 | 类别 | 严重度 | 可校验 |
|------|------|------|--------|--------|
| AI-001 | 先读 Spec 再写码 | ai-behavior | blocking (machine-enforced, R12 升级) | ✅ |
| AI-002 | 测试先行 | ai-behavior | blocking (machine-enforced, R12 升级) | ✅ |
| AI-003 | 禁止越界发挥 | ai-behavior | blocking (machine-enforced, R12 升级) | ✅ |
| AI-004 | 每次改动必跑三件套 | ai-behavior | blocking | ✅ |
| AI-005 | 禁止硬编码跨域可变集合，用 SSOT 派生断言 | ai-behavior | blocking | ✅ |
| AI-006 | 遇到歧义必须阻断 | ai-behavior | blocking | 👁 |
| AI-007 | 端到端验收 + PRD 逐条核对 | ai-behavior | blocking (machine-enforced, R12 升级) | ✅ |
| ARCH-001 | 单向依赖方向 | architecture | blocking | ✅ |
| ARCH-002 | 契约层纯净 | architecture | blocking | ✅ |
| ARCH-003 | 跨层通信只经契约 | architecture | blocking | ✅ |
| CODE-001 | 禁止 any | coding | blocking | ✅ |
| CODE-002 | 禁止吞错误 | coding | blocking | ✅ |
| CODE-003 | 命名约定 | coding | suggestion | ✅ |
| CODE-004 | 模块边界 | coding | blocking | ✅ |
| FRONTEND-001 | 前端可变配置从 API 获取 | frontend | blocking (machine-enforced, R12 升级) | ✅ |
| FRONTEND-002 | 前端 API Client 与后端契约保持同步 | frontend | advisory → machine-enforced (R12) | ✅ |
| META-001 | 无校验不立规 | meta | blocking | ✅ |
| META-002 | 规则 PR 准入 | meta | blocking | 👁 |
| META-003 | 声明即实现 | meta | blocking | ✅ |
| META-004 | 实现即声明 | meta | blocking | ✅ |
| META-005 | 复盘必写入 | meta | blocking | ✅ |
| SEC-001 | 路由默认受保护 | security | blocking | ✅ |
| SEC-002 | 密钥不入仓 | security | blocking | ✅ |
| SEC-003 | 输入校验 | security | blocking | ✅ |

> R12 关键变更：AI-001/002/003/007 + FRONTEND-001/002 全部升级为 machine-enforced，enforcement 项数 18→22。

## 路由表

### 顶层路由（`apps/api/src/server.ts`）

| 方法 | 路径 | 来源轮次 |
|------|------|---------|
| GET | `/api/health` | R1 |
| GET | `/api/models` | R8（SSOT 模型下发） |
| GET | `/api/admin/metrics` | R7（LLM 可观测性，D13） |

### Persona Router（`router/persona.router.ts`，挂在 `/api/personas`）

| 方法 | 路径 | 来源轮次 |
|------|------|---------|
| GET | `/` | R1（R8 增强 sort 参数） |
| GET | `/hot` | R8（D14 热门推荐） |
| GET | `/:id` | R1 |
| POST | `/` | R1 |
| PUT | `/:id` | R1 |
| DELETE | `/:id` | R1 |
| POST | `/sync` | R2（GitHub 批量同步） |
| GET | `/:id/stats` | R7（D11 评价反馈聚合） |
| POST | `/preview` | R8（D15 人格工坊预览） |

### Chat Router（`router/chat.router.ts`，挂在 `/api/chats`）

| 方法 | 路径 | 来源轮次 |
|------|------|---------|
| POST | `/` | R1（R7 增强 parentRecordId，R9 增强 tools） |
| POST | `/stream` | R7（D9 SSE 流式，R9 增强 tool 事件） |
| GET | `/:userId` | R1 |
| GET | `/branches/:recordId` | R7（D10 对话分支） |
| DELETE | `/:id` | R1 |
| PUT | `/:id/rate` | R7（D11 评价反馈） |

## 契约速查

### schemas/chat.ts
- Schemas: messageRoleSchema, toolCallSchema, chatMessageSchema, chatRequestSchema, chatResponseSchema, chatRecordSchema, chatHistoryQuerySchema, streamEventSchema, chatStreamRequestSchema, branchListQuerySchema, branchRecordSchema, ratingSchema, rateMessageSchema
- Types: MessageRole, ToolCall, ChatMessage, ChatRequest, ChatResponse, ChatRecord, ChatHistoryQuery, StreamEvent, ChatStreamRequest, BranchListQuery, BranchRecord, Rating, RateMessage
- 关键演进: R9 新增 tool 角色 / tool_calls / tool_call_id / name 字段；streamEventSchema 新增 tool_start/tool_args/tool_end

### schemas/common.ts
- Schemas: errorCodeSchema, apiResponseSchema, paginationSchema, builtinModelIdSchema, modelConfigSchema, personaCategorySchema
- Types: ErrorCode, Pagination, ModelRegistryEntry, BuiltinModelId, ModelConfig, PersonaCategory

### schemas/persona.ts
- Schemas: personaSchema, personaCreateSchema, personaUpdateSchema, personaQuerySchema, personaSourceSchema, personaSummarySchema
- Types: Persona, PersonaCreate, PersonaUpdate, PersonaQuery, PersonaSource, PersonaSummary
- 关键演进: R8 新增 personaSummarySchema（含 likeRate/messageCount）；R9 personaSchema 新增 tools?: string[]

### schemas/tool.ts
- Schemas: toolRegistry (const array), builtinToolNames
- Types: ToolDefinition, BuiltinToolName
- 函数: toOpenAITools(toolNames)
- 关键演进: R9 新建（D16 工具注册表 SSOT），含 calculator / current_time / web_search 三个内置工具

### schemas/user.ts
- Schemas: userModelSchema, userProfileSchema, saveModelRequestSchema
- Types: UserModel, UserProfile, SaveModelRequest

## 关键约定

- **错误码映射**: `packages/contracts/src/schemas/common.ts` (SSOT)
- **错误码列表**: 1001 NOT_FOUND / 1002 VALIDATION_ERROR / 1003 LLM_STREAM_ERROR (R7) / 1004 LLM_PREVIEW_ERROR (R8) / 1005 TOOL_EXECUTION_ERROR (R9) / 1006 TOOL_LOOP_LIMIT (R9) / 1007 TOOL_NOT_CONFIGURED (R9) / 5000 INTERNAL_ERROR
- **鉴权模式**: SEC-001 advisory（authMiddleware 已挂载到 `/api/personas` + `/api/chats`，开发模式无 API_KEY 时允许所有请求）
- **PII 边界**: 不存储用户原始输入到持久化层
- **命名**: 文件 kebab-case，类 PascalCase，API 端点 /api/{resource}
- **数据库**: D1 with prepare+bind，禁止字符串拼接；首次请求自动 ensureTables
- **流式协议**: SSE 事件类型 delta / done / error / tool_start / tool_args / tool_end
- **R12 前端 token**: Tailwind colors 封闭为 primary/surface/semantic 三组；CSS 变量驱动双主题（`:root` 亮色 / `.dark` 暗色）

## 轮次完成状态

| 轮次 | 标题 | 状态 | Spec-First | trinity | 文档完整 |
|------|------|------|------------|---------|---------|
| R1 | 项目重构为 AI-Native 架构 | ✅ | advisory | ✅ | ✅ |
| R2 | 人格域完整实现 + 可运行验证 | ✅ | advisory | ✅ | ✅ |
| R3 | Persona CRUD + TDD + Spec-Binding 雏形 | ✅ | advisory | ✅ | ✅ |
| R4 | Chat DELETE + Spec-Binding 引入 + 前端 SSOT | ✅ | advisory | ✅ | ✅ |
| R5 | 前端历史分页 + 删除 | ✅ | advisory | ✅ | ✅ |
| R6 | Spec-Binding 收尾 + 复盘机制补齐 | ✅ | advisory | ✅ | ✅ |
| R7 | AI Native 深度体验 | ✅ | ❌ 违规 | ✅ | ✅ 回溯 |
| R8 | 人格市场 + 工坊 | ✅ | ❌ 违规 | ✅ | ✅ 回溯 |
| R9 | Tool Use / Function Calling | ✅ | ❌ 违规 | ✅ | ✅ 回溯 |
| R10 | Web 客户端 + PWA | ✅ | ❌ 违规 | ✅ | ✅ 回溯 |
| R11 | 小程序功能对齐 Web 端 | ✅ CONDITIONAL → APPROVED | advisory | ✅ | ✅ |
| R12 | 前端样式大改 + 双主题 | ✅ | ✅ machine-enforced | ✅ | ✅ 完整五角色 |

## 文档索引

> 完整索引见 [docs/INDEX.md](INDEX.md)。下面按类型汇总：

### 工作流与上下文（4）
- [AGENTS.md](../AGENTS.md)
- [docs/workflow/spec-first-workflow.md](workflow/spec-first-workflow.md)
- [docs/context-snapshot.md](context-snapshot.md)
- [docs/retro/lessons-learned.md](retro/lessons-learned.md)

### PRD（8）
- [docs/prd/R1-monorepo-refactor.md](prd/R1-monorepo-refactor.md)
- [docs/prd/R2-persona-domain-complete.md](prd/R2-persona-domain-complete.md)
- [docs/prd/R7-ai-native-experience.md](prd/R7-ai-native-experience.md)
- [docs/prd/R8-persona-marketplace.md](prd/R8-persona-marketplace.md)
- [docs/prd/R9-tool-use.md](prd/R9-tool-use.md)
- [docs/prd/R10-web-client-pwa.md](prd/R10-web-client-pwa.md)
- [docs/prd/R11-miniprogram-parity.md](prd/R11-miniprogram-parity.md)
- [docs/prd/R12-frontend-style-overhaul.md](prd/R12-frontend-style-overhaul.md)

### Tech-Spec（7）
- [docs/spec/persona-crud.tech.md](spec/persona-crud.tech.md) — R2/R3
- [docs/spec/R7-ai-native.tech.md](spec/R7-ai-native.tech.md) — R7
- [docs/spec/R8-marketplace.tech.md](spec/R8-marketplace.tech.md) — R8
- [docs/spec/R9-tool-use.tech.md](spec/R9-tool-use.tech.md) — R9
- [docs/spec/R10-web-client.tech.md](spec/R10-web-client.tech.md) — R10
- [docs/spec/miniprogram-parity.tech.md](spec/miniprogram-parity.tech.md) — R11
- [docs/spec/R12-frontend-style-overhaul.tech.md](spec/R12-frontend-style-overhaul.tech.md) — R12

### Review 报告（12）
- [docs/review/R1-monorepo-refactor-review.md](review/R1-monorepo-refactor-review.md)
- [docs/review/R2-persona-domain-complete-review.md](review/R2-persona-domain-complete-review.md)
- [docs/review/R3-persona-stats-review.md](review/R3-persona-stats-review.md)
- [docs/review/R4-spec-binding-review.md](review/R4-spec-binding-review.md)
- [docs/review/R5-frontend-pagination-review.md](review/R5-frontend-pagination-review.md)
- [docs/review/R6-spec-binding-cleanup-review.md](review/R6-spec-binding-cleanup-review.md)
- [docs/review/R7-ai-native-review.md](review/R7-ai-native-review.md)
- [docs/review/R8-marketplace-review.md](review/R8-marketplace-review.md)
- [docs/review/R9-tool-use-review.md](review/R9-tool-use-review.md)
- [docs/review/R10-web-client-review.md](review/R10-web-client-review.md)
- [docs/review/R11-miniprogram-parity-review.md](review/R11-miniprogram-parity-review.md)
- [docs/review/R12-frontend-style-overhaul-review.md](review/R12-frontend-style-overhaul-review.md)

### 复盘（12）
- [docs/retro/round-1.md](retro/round-1.md) ~ [docs/retro/round-12.md](retro/round-12.md)（R1-R12 逐轮）
- [docs/retro/round-7-10-procedural-violation.md](retro/round-7-10-procedural-violation.md) — R7-R10 流程违规合并复盘
- [docs/retro/lessons-learned.md](retro/lessons-learned.md) — 教训索引

### Round Delta（11）
- [docs/round-1-delta.md](round-1-delta.md)
- [docs/round-2-delta.md](round-2-delta.md)
- [docs/round-3-delta.md](round-3-delta.md)
- [docs/round-4-delta.md](round-4-delta.md)
- [docs/round-5-delta.md](round-5-delta.md)
- [docs/round-6-delta.md](round-6-delta.md)
- [docs/round-7-delta.md](round-7-delta.md)
- [docs/round-8-delta.md](round-8-delta.md)
- [docs/round-9-delta.md](round-9-delta.md)
- [docs/round-10-delta.md](round-10-delta.md)
- [docs/round-11-delta.md](round-11-delta.md)
- [docs/round-12-delta.md](round-12-delta.md)

### 其他（7）
- [docs/ai-native-transformation-plan.md](ai-native-transformation-plan.md)
- [docs/deploy-guide.md](deploy-guide.md)
- [docs/test-design.md](test-design.md)
- [docs/test-plan.md](test-plan.md)
- [docs/project-review.md](project-review.md)
- [docs/final-review.md](final-review.md)
- [docs/INDEX.md](INDEX.md) — 文档总索引
