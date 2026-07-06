# Tech-Spec: AI Native 深度体验 (Round 7)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R7-ai-native-experience.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D8** | SSE 流式使用 Web Streams API，不做缓冲 | CF Workers 原生支持 ReadableStream；缓冲增加首字延迟 | `apps/api/src/domain/llm.ts` → `sseStreamToDeltaStream()` |
| **D9** | 流式路由 `POST /api/chats/stream` 独立于非流式，保留向后兼容 | 避免破坏现有调用方 | `apps/api/src/router/chat.router.ts` → `router.post('/stream', ...)` |
| **D10** | 对话分支用 `parent_record_id + branch_index` 双字段，不新建"对话树"表 | 最小化 schema 变更；分支查询只需一次 JOIN | `apps/api/schema.sql` ALTER `chat_records`；`apps/api/src/router/chat.router.ts` → `GET /branches/:recordId` |
| **D11** | 评级用单表 rating 字段，stats 通过 SQL 聚合 | 避免写放大；开源模板不适合引入物化视图 | `apps/api/schema.sql` `chat_records.rating`；`apps/api/src/repository/chat-repo.ts` → `getPersonaStats()` |
| **D12** | 人格记忆用关键词匹配 + 最近 N 条，不引入向量数据库 | 开箱即用，零额外依赖 | `apps/api/src/domain/memory.ts`；`apps/api/src/repository/memory-repo.ts` |
| **D13** | LLM 可观测自建 `llm_call_logs` 表，不绑定外部 SaaS | 模板的零依赖原则 | `apps/api/src/domain/llm.ts` → `setLLMLogger()`；`apps/api/src/server.ts` → `GET /api/admin/metrics` |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D8 alt A: WebSocket 双向流式 | CF Workers WebSocket 支持有限，且本场景是单向服务端推送，SSE 已足够。增加协议复杂度无收益。 |
| D8 alt B: 客户端轮询 `/api/chats/:id/partial` | 轮询延迟高（500ms+），且产生大量空响应请求。SSE 是单向推送的天然选择。 |
| D9 alt A: 改写现有 `POST /api/chats` 直接返回流 | 破坏非流式调用方语义（前端同步等待 `reply` 字段），违反"接口即契约"原则。 |
| D9 alt B: 通过 `Accept: text/event-stream` 头切换响应模式 | 单个路由承担双语义增加测试覆盖复杂度，错误处理路径分叉多。独立路由更显式。 |
| D10 alt A: 新建 `conversation_branches` 表存放分支树 | 分支查询需要双 JOIN（branch + record），且分支数通常 ≤3，单表自引用已足够。引入新表徒增 ORM 复杂度。 |
| D10 alt B: 用 `messages` JSON 内嵌分支 | 分支数据混入业务字段，无法 SQL 索引和聚合统计（如"该分支好评率"）。 |
| D11 alt A: 冗余 `personas.like_rate` / `personas.message_count` 列 | 评分变动需同步更新 personas 表，引入写放大与一致性风险。SQL 聚合在 D1 上对当前数据量（<10K 行）毫秒级返回。 |
| D11 alt B: 引入物化视图 | D1/SQLite 不支持物化视图，需应用层定时刷新，反而增加运维复杂度。 |
| D12 alt A: 引入 Cloudflare Vectorize 向量检索 | 需额外绑定与计费，超出"开源模板零依赖"范围。当前记忆规模（百级）向量召回收益不显著。 |
| D12 alt B: 全量注入历史消息到 prompt | 上下文长度爆炸，token 成本不可控。关键词匹配 + importance 排序是最低成本的"选择性记忆"。 |
| D13 alt A: 接入 LangSmith / Helicone 等 SaaS | 引入外部凭据依赖（违反 SEC-002 精神），开源模板不应绑定第三方账号。 |
| D13 alt B: 复用 `chat_records` 表加 `model` 字段做聚合 | 缺少 latency / token / error 等独立指标维度，查询会拖慢业务表。专用日志表更清晰。 |

---

## 二、数据模型变更

### chat_records 表
```sql
ALTER TABLE chat_records ADD COLUMN parent_record_id INTEGER;
ALTER TABLE chat_records ADD COLUMN branch_index INTEGER DEFAULT 0;
ALTER TABLE chat_records ADD COLUMN rating TEXT;
```

### 新建 persona_memories 表
```sql
CREATE TABLE persona_memories (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, persona_id TEXT NOT NULL,
  key TEXT NOT NULL, value TEXT NOT NULL, category TEXT DEFAULT 'fact',
  importance INTEGER DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
```

### 新建 llm_call_logs 表
```sql
CREATE TABLE llm_call_logs (
  id TEXT PRIMARY KEY, model TEXT NOT NULL, provider TEXT NOT NULL,
  prompt_tokens INTEGER, completion_tokens INTEGER, latency_ms INTEGER,
  status TEXT NOT NULL, error_message TEXT, created_at INTEGER NOT NULL
);
```

## 三、路由设计

| 方法 | 路径 | 状态 | Dx |
|------|------|------|----|
| POST | `/api/chats/stream` | 新增 | D9 |
| GET | `/api/chats/branches/:recordId` | 新增 | D10 |
| PUT | `/api/chats/:id/rate` | 新增 | D11 |
| GET | `/api/personas/:id/stats` | 新增 | D11 |
| GET | `/api/admin/metrics` | 新增 | D13 |

## 四、文件拆分

- `chat-svc.ts` 拆出 `chat-helpers.ts`：`saveRecordAsync()` + `extractMemoriesAsync()`（保持 ≤300 行）
- 新建 `domain/memory.ts`：`buildMemoryExtractionPrompt()` / `injectMemories()` / `summarizeConversation()`
- 新建 `repository/memory-repo.ts`

## 五、契约层变更

| Schema | 变更 |
|--------|------|
| `streamEventSchema` | 新增 delta/done/error 三种事件 |
| `chatRecordSchema` | 新增 parentRecordId/branchIndex 可选字段 |
| `rateMessageSchema` | 新建 like/dislike 枚举 |
| `personaStatsSchema` | 新建统计对象 |

---

## 六、错误码定义

| 错误码 | HTTP | 场景 |
|--------|------|------|
| 1001 (NOT_FOUND) | 404 | personaId 不存在（AC-F1.4）；分支父记录不存在（AC-F2.3）；评分目标记录不存在（AC-F3.2） |
| 1002 (VALIDATION_ERROR) | 400 | messages 字段缺失（AC-F1.3）；rating 非 like/dislike 枚举值（AC-F3.3） |
| 1003 (LLM_STREAM_ERROR) | 500 | SSE 流中途失败（D8）；上游 LLM 超时或断流 |
| 5000 (INTERNAL_ERROR) | 500 | D1 写入失败；记忆提取异步任务失败（不阻塞主流程，仅记日志） |

> 注：LLM_STREAM_ERROR (1003) 为本轮新增错误码，对应 streamEventSchema 的 `error` 事件类型。

---

## 七、变更清单

### 新增文件

| 文件路径 | 功能 | Dx |
|---------|------|----|
| `apps/api/src/domain/memory.ts` | 人格记忆构建/注入/总结纯函数 | D12 |
| `apps/api/src/repository/memory-repo.ts` | persona_memories CRUD | D12 |
| `apps/api/src/service/chat-helpers.ts` | 从 chat-svc 拆出的 `saveRecordAsync()` + `extractMemoriesAsync()` | D8, D12 |

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `apps/api/src/router/chat.router.ts` | 新增 `POST /stream`、`GET /branches/:recordId`、`PUT /:id/rate` 路由 | ≤300 |
| `apps/api/src/service/chat-svc.ts` | 流式 chat 入口；分支创建；拆出 chat-helpers 后保留主流程 | ≤300 |
| `apps/api/src/repository/chat-repo.ts` | 新增 `findBranches()` / `rate()` / `getPersonaStats()` 方法 | ≤300 |
| `apps/api/src/domain/llm.ts` | 新增 `sseStreamToDeltaStream()`；`setLLMLogger()` 钩子 | ≤300 |
| `apps/api/src/server.ts` | 注册 `GET /api/admin/metrics`；装配 LLM 日志中间件 | ≤300 |
| `apps/api/schema.sql` | chat_records ALTER 3 列；CREATE persona_memories / llm_call_logs 2 表 + 索引 | - |
| `packages/contracts/src/schemas/chat.ts` | streamEventSchema 加 delta/done/error；chatRecordSchema 加 parentRecordId/branchIndex；rateMessageSchema 新建 | - |
| `packages/contracts/src/schemas/persona.ts` | personaStatsSchema 新建（messageCount / likeRate / totalRatings） | - |
| `apps/api/test/chat.e2e.test.ts` | 新增 R7-R19 共 11 个 AC 的 E2E 断言（流式/分支/评分/统计） | - |

### 删除文件

(无)

---

## 八、迁移/回滚方案

### 迁移步骤

1. 在 D1 中执行 `apps/api/schema.sql` 的新增段落：
   - `ALTER TABLE chat_records ADD COLUMN parent_record_id INTEGER`（NULL 表示根消息）
   - `ALTER TABLE chat_records ADD COLUMN branch_index INTEGER DEFAULT 0`
   - `ALTER TABLE chat_records ADD COLUMN rating TEXT`
   - `CREATE TABLE persona_memories (...)` + 索引
   - `CREATE TABLE llm_call_logs (...)` + 索引
2. 部署新版本 Worker（CF Workers 滚动发布，旧版本仍可读新表 NULL 字段，向后兼容）
3. 旧客户端访问 `POST /api/chats`（非流式）不受影响；新字段为 NULL 时 `branch_index` 默认 0，`rating` 默认 NULL

### 回滚步骤

```bash
# 1. 通过 git revert 回滚应用代码
git revert <round-7-commit-hash>

# 2. 在 D1 控制台执行回滚 SQL（按依赖逆序）
DROP TABLE IF EXISTS llm_call_logs;
DROP TABLE IF EXISTS persona_memories;
ALTER TABLE chat_records DROP COLUMN rating;
ALTER TABLE chat_records DROP COLUMN branch_index;
ALTER TABLE chat_records DROP COLUMN parent_record_id;
```

回滚影响：
- 旧版代码读取 NULL 新字段无副作用（向后兼容设计）
- DROP COLUMN 在 D1 上是 O(1) 元数据操作，不阻塞读写
- 已删除的分支关系和评分记录不可恢复（业务可接受 — 评分数据无强一致性要求）

---

## 九、测试策略

| 测试类型 | 文件 | 覆盖功能 | AC |
|---------|------|---------|----|
| **E2E — 流式** | `apps/api/test/chat.e2e.test.ts` | SSE delta/done/error 事件、400/404 错误路径 | AC-F1.1–F1.4 (R7-R10) |
| **E2E — 分支** | `apps/api/test/chat.e2e.test.ts` | parent_record_id 写入、GET /branches 返回 0/1/N 条、404 | AC-F2.1–F2.3 (R13-R15) |
| **E2E — 评分** | `apps/api/test/chat.e2e.test.ts` | PUT /rate 200/404/400；GET /stats 聚合 | AC-F3.1–F3.4 (R16-R19) |
| **单元 — 记忆** | `apps/api/test/chat-svc.test.ts` | `extractMemoriesAsync()` mock LLM 提取关键事实；`injectMemories()` 拼接 system prompt | AC-F4 |
| **单元 — LLM 日志** | `apps/api/test/chat-svc.test.ts` | mock `setLLMLogger()` 验证 latency/tokens/status 写入 llm_call_logs | AC-F5 |
| **手动验证 — metrics** | `curl /api/admin/metrics?period=24h` | 聚合字段（model/providers/calls/tokens/errorRate） | AC-F5 |

### 关键测试场景

```
AC-F1.2 (流式响应体):
  ✓ POST /api/chats/stream → 200 + content-type: text/event-stream
  ✓ body 包含 data: {"type":"delta",...} 多条 + data: {"type":"done"}
  ✓ 缺 messages → 400 (AC-F1.3)
  ✓ persona 不存在 → 404 (AC-F1.4)

AC-F3.4 (人格统计):
  ✓ 给 80 条 like + 20 条 dislike → GET /personas/:id/stats 返回 likeRate=0.8, totalMessages=100
  ✓ 无评分记录 → likeRate=0, totalMessages=N

AC-F4 (人格记忆):
  ✓ 第一次对话提到"我喜欢猫" → 异步提取 key=like, value=cat
  ✓ 第二次对话 → system prompt 包含"喜欢猫"记忆片段
  ✓ importance 排序：核心事实 > 偏好 > 闲聊

AC-F5 (可观测性):
  ✓ /api/admin/metrics?period=24h → 返回 model 维度聚合
  ✓ LLM 调用失败 → llm_call_logs.status='error', error_message 非空
```
