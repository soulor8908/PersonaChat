# PersonaChat 项目上下文快照
> 生成日期: 2026-07-04 | 最近轮次: Round 1

## 项目概览

| 指标 | 数值 |
|------|------|
| 规则 | 21 条 |
| - ai-behavior | 7 |
| - architecture | 3 |
| - coding | 4 |
| - meta | 4 |
| - security | 3 |
| 契约 Schema | 5 个 |
| API 路由 | 9 条 |
| API 源文件 | 13 个 |
| Spec 文档 | 0 个 |
| E2E 测试 | 0 个 |
| CI | 已配置 |
| 文档 | 9 个 |

## 架构速查

```
apps/miniprogram  (微信小程序 — 只通过 HTTP API 通信)
       │
       ▼
apps/api/src/router/     ← Hono 路由层 (Zod 输入校验)
apps/api/src/service/    ← 业务逻辑层
apps/api/src/repository/ ← 数据访问层 (D1)
apps/api/src/domain/     ← 纯函数领域逻辑
apps/api/src/middleware/  ← 横切关注点 (cors, error)

packages/contracts/  ← Zod SSOT 契约层 (前后端共享)
```

**依赖方向**: domain ↚ repository/service/router（禁止反向）
**契约层**: 只依赖 zod + typescript + vitest（ARCH-002）

## 规则速查

| 规则 | 标题 | 类别 | 严重度 | 可校验 |
|------|------|------|--------|--------|
| AI-001 | 先读 Spec 再写码 | ai-behavior | blocking | 👁 |
| AI-002 | 测试先行 | ai-behavior | blocking | ✅ |
| AI-003 | 禁止越界发挥 | ai-behavior | blocking | 👁 |
| AI-004 | 每次改动必跑三件套 | ai-behavior | blocking | ✅ |
| AI-005 | 禁止硬编码跨域可变集合，用 SSOT 派生断言 | ai-behavior | blocking | ✅ |
| AI-006 | 遇到歧义必须阻断 | ai-behavior | blocking | 👁 |
| AI-007 | 端到端验收 + PRD 逐条核对 | ai-behavior | blocking | ✅ |
| ARCH-001 | 单向依赖方向 | architecture | blocking | ✅ |
| ARCH-002 | 契约层纯净 | architecture | blocking | ✅ |
| ARCH-003 | 跨层通信只经契约 | architecture | blocking | ✅ |
| CODE-001 | 禁止 any | coding | blocking | ✅ |
| CODE-002 | 禁止吞错误 | coding | blocking | ✅ |
| CODE-003 | 命名约定 | coding | suggestion | ✅ |
| CODE-004 | 模块边界 | coding | blocking | ✅ |
| META-001 | 无校验不立规 | meta | blocking | ✅ |
| META-002 | 规则 PR 准入 | meta | blocking | 👁 |
| META-003 | 声明即实现 | meta | blocking | ✅ |
| META-004 | 实现即声明 | meta | blocking | ✅ |
| SEC-001 | 路由默认受保护 | security | blocking | ✅ |
| SEC-002 | 密钥不入仓 | security | blocking | ✅ |
| SEC-003 | 输入校验 | security | blocking | ✅ |

## 路由表

| 方法 | 路径 | 文件 |
|------|------|------|
| GET | `/` | router\persona.router.ts |
| POST | `/` | router\chat.router.ts |
| DELETE | `/:id` | router\persona.router.ts |
| GET | `/:id` | router\persona.router.ts |
| PUT | `/:id` | router\persona.router.ts |
| GET | `/:userId` | router\chat.router.ts |
| GET | `/api/health` | server.ts |
| POST | `/sync` | router\persona.router.ts |

## 契约速查

### schemas\chat.ts
- Schemas: messageRoleSchema, chatMessageSchema, chatRequestSchema, chatResponseSchema, chatRecordSchema, chatHistoryQuerySchema
- Types: MessageRole, ChatMessage, ChatRequest, ChatResponse, ChatRecord, ChatHistoryQuery

### schemas\common.ts
- Schemas: errorCodeSchema, apiResponseSchema, paginationSchema, builtinModelIdSchema, modelConfigSchema, personaCategorySchema
- Types: ErrorCode, Pagination, ModelConfig, PersonaCategory

### schemas\persona.ts
- Schemas: personaSchema, personaCreateSchema, personaUpdateSchema, personaQuerySchema, personaSourceSchema
- Types: Persona, PersonaCreate, PersonaUpdate, PersonaQuery, PersonaSource

### schemas\user.ts
- Schemas: userModelSchema, userProfileSchema, saveModelRequestSchema
- Types: UserModel, UserProfile, SaveModelRequest

## 关键约定

- **错误码映射**: `packages/contracts/src/schemas/common.ts` (SSOT)
- **鉴权模式**: 当前无鉴权层 (SEC-001 advisory)，路由默认公开
- **PII 边界**: 不存储用户原始输入到持久化层
- **命名**: 文件 kebab-case，类 PascalCase，API 端点 /api/{resource}
- **数据库**: D1 with prepare+bind，禁止字符串拼接

## 文档索引

- [docs/ai-native-transformation-plan.md](docs/ai-native-transformation-plan.md)
- [docs/context-snapshot.md](docs/context-snapshot.md)
- [docs/deploy-guide.md](docs/deploy-guide.md)
- [docs/prd/R1-monorepo-refactor.md](docs/prd/R1-monorepo-refactor.md)
- [docs/prd/R2-persona-domain-complete.md](docs/prd/R2-persona-domain-complete.md)
- [docs/retro/lessons-learned.md](docs/retro/lessons-learned.md)
- [docs/retro/round-1.md](docs/retro/round-1.md)
- [docs/round-2-delta.md](docs/round-2-delta.md)
- [docs/workflow/spec-first-workflow.md](docs/workflow/spec-first-workflow.md)
