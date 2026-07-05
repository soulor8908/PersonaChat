# Tech-Spec: AI Native 深度体验 (Round 7)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R7-ai-native-experience.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D8** | SSE 流式使用 Web Streams API，不做缓冲 | CF Workers 原生支持 ReadableStream；缓冲增加首字延迟 | `domain/llm.ts` → `sseStreamToDeltaStream()` |
| **D9** | 流式路由 `POST /api/chats/stream` 独立于非流式，保留向后兼容 | 避免破坏现有调用方 | `router/chat.router.ts` → `router.post('/stream', ...)` |
| **D10** | 对话分支用 `parent_record_id + branch_index` 双字段，不新建"对话树"表 | 最小化 schema 变更；分支查询只需一次 JOIN | `chat_records` 表 ALTER；`router/chat.router.ts` → `GET /branches/:recordId` |
| **D11** | 评级用单表 rating 字段，stats 通过 SQL 聚合 | 避免写放大；开源模板不适合引入物化视图 | `chat_records.rating`；`repository/chat-repo.ts` → `getPersonaStats()` |
| **D12** | 人格记忆用关键词匹配 + 最近 N 条，不引入向量数据库 | 开箱即用，零额外依赖 | `domain/memory.ts`；`repository/memory-repo.ts` |
| **D13** | LLM 可观测自建 `llm_call_logs` 表，不绑定外部 SaaS | 模板的零依赖原则 | `domain/llm.ts` → `setLLMLogger()`；`server.ts` → `GET /api/admin/metrics` |

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
