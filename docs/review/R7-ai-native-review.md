# Round 7 评审报告: AI Native 深度体验

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: `docs/prd/R7-ai-native-experience.md`（回溯补齐）
> **对应 Tech-Spec**: `docs/spec/R7-ai-native.tech.md`（回溯补齐）
> **范围**: F1 流式输出 (SSE) + F2 对话分支 + F3 评价反馈 + F4 人格记忆 + F5 LLM 可观测性，共 5 大特性
> **状态**: 回溯补齐（代码已交付，文档后补）

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ❌ **流程违规** | PRD/Tech-Spec 在编码时不存在；R7 之后才回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md` |
| **G0: AI-002 测试先行** | ⚠️ advisory | 测试与代码同步交付，非严格"红 → 绿"；测试数 48→64（新增 16 个 SSE/分支/评分用例） |
| **G0: AI-003 越界检测** | N/A | R7 时 G0 未机器化（R12 才升级） |
| **G0: AI-007 E2E 验收** | ⚠️ advisory | chat.e2e.test.ts 新增 R7-R19 共 11 个 AC 用例 |
| **G1: PRD** | ✅ (回溯) | PRD 含 AC-F1~F5 共 25 项 AC（正常/边界/错误三类）；BLOCKING Q&A 3 项 |
| **G3: Tech-Spec** | ✅ (回溯) | D8-D13 共 6 条决策，每条含拒绝方案（6 条 alt 方案） + 代码绑定 |
| **G3.5: Spec-Binding** | ⚠️ | 部分代码含 D8-D13 注释；R6 之前已有 D1-D8 注释保持 |
| **G4: 测试覆盖** | ✅ | chat.e2e.test.ts R7-R19 覆盖 F1/F2/F3；chat-svc.test.ts 覆盖 F4/F5 单元 |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules + vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ✅ | 代码质量通过；详见下文 |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `apps/api/src/router/chat.router.ts`

| 方面 | 评估 |
|------|------|
| `POST /api/chats/stream` (D9) | ✅ SSE 流式独立路由，保留非流式向后兼容 |
| `GET /api/chats/branches/:recordId` (D10) | ✅ parent_record_id + branch_index 双字段查询 |
| `PUT /api/chats/:id/rate` (D11) | ✅ rateMessageSchema.parse 入口校验 |
| `GET /api/personas/:id/stats` (D11) | ✅ SQL 聚合 likeRate / totalMessages |
| Zod 入口校验 | ✅ 所有路由 SEC-003 通过 |

### 2.2 `apps/api/src/domain/llm.ts`

| 方面 | 评估 |
|------|------|
| `sseStreamToDeltaStream()` (D8) | ✅ Web Streams API + ReadableStream；CF Workers 原生支持 |
| `setLLMLogger()` 钩子 (D13) | ✅ fire-and-forget 写入 llm_call_logs |
| 错误处理 | ✅ LLM 5xx → SSE error 事件（AC-F1.5） |
| 文件行数 | ✅ ≤300 行（已拆分 chat-helpers.ts） |

### 2.3 `apps/api/src/service/chat-svc.ts` + `chat-helpers.ts`

| 方面 | 评估 |
|------|------|
| 流式 chat 入口 | ✅ accumulateReply + onComplete 异步保存 |
| 分支创建 | ✅ parentRecordId + branchIndex 递增 |
| **文件拆分** | ✅ chat-helpers.ts 拆出 saveRecordAsync + extractMemoriesAsync（保持 ≤300 行） |
| 记忆提取异步 | ✅ 不阻塞主对话（AC-F4.5） |
| 记忆注入异常 | ✅ 不阻断响应（AC-F4.6） |

### 2.4 `apps/api/src/domain/memory.ts` + `repository/memory-repo.ts`

| 方面 | 评估 |
|------|------|
| `buildMemoryExtractionPrompt()` | ✅ 关键事实提取 prompt |
| `injectMemories()` (D12) | ✅ 关键词匹配 + 最近 N 条；零向量数据库依赖 |
| `summarizeConversation()` | ✅ 对话总结 |
| importance 排序 | ✅ 核心事实 > 偏好 > 闲聊 |

### 2.5 `apps/api/src/server.ts`

| 方面 | 评估 |
|------|------|
| `GET /api/admin/metrics` (D13) | ✅ period 参数 Zod 校验 [1, 720] |
| LLM 日志中间件装配 | ✅ setLLMLogger 回调写入 llm_call_logs |
| 鉴权 | ⚠️ SEC-001 advisory — metrics 暂公开 |

### 2.6 `apps/api/schema.sql`

| 方面 | 评估 |
|------|------|
| `chat_records` ALTER 3 列 | ✅ parent_record_id / branch_index / rating |
| `persona_memories` 表 (D12) | ✅ key-value 结构 + importance + created_at |
| `llm_call_logs` 表 (D13) | ✅ model/provider/latency/tokens/status |
| 索引 | ✅ persona_memories(persona_id, user_id) + llm_call_logs(created_at) |

### 2.7 `packages/contracts/src/schemas/chat.ts` + `persona.ts`

| 方面 | 评估 |
|------|------|
| `streamEventSchema` | ✅ delta/done/error 三种事件 |
| `chatRecordSchema` | ✅ 新增 parentRecordId/branchIndex 可选字段 |
| `rateMessageSchema` | ✅ like/dislike 枚举 |
| `personaStatsSchema` | ✅ messageCount/likeRate/totalRatings |

### 2.8 `apps/api/test/chat.e2e.test.ts`（R7-R19 共 11 个 AC）

| 方面 | 评估 |
|------|------|
| AC-F1.1 流式 200 + text/event-stream | ✅ |
| AC-F1.2 delta + done 事件 | ✅ |
| AC-F1.3 缺 messages 400 | ✅ |
| AC-F1.4 persona 不存在 404 | ✅ |
| AC-F2.1 parentRecordId 写入 | ✅ |
| AC-F2.2 GET /branches 返回 N 条 | ✅ |
| AC-F2.3 不存在记录 404 | ✅ |
| AC-F3.1 PUT /rate 200 | ✅ |
| AC-F3.2 不存在记录 404 | ✅ |
| AC-F3.3 无效 rating 400 | ✅ |
| AC-F3.4 GET /stats 聚合 | ✅ likeRate=0.8 |

### 2.9 `apps/api/test/chat-svc.test.ts`（F4/F5 单元）

| 方面 | 评估 |
|------|------|
| AC-F4.1 记忆提取 + 注入 | ✅ mock LLM 提取关键事实 |
| AC-F4.5 记忆提取失败不阻塞 | ✅ console.warn，主对话不受影响 |
| AC-F5.1 metrics 聚合 | ✅ model/calls/avgLatency/errorRate/totalTokens |
| AC-F5.7 llm_call_logs 写入失败 | ✅ console.warn，fire-and-forget |

---

## 3. 问题清单

### 3.1 流程合规

| ID | 严重度 | 描述 |
|----|--------|------|
| **P1** | **P0** | **流程违规 — 跳过 Spec-First**：PRD/Tech-Spec 在 R7 编码时不存在，事后回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md`。教训 L17: Plan Mode ≠ Spec 文档 |

### 3.2 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | 代码已交付，trinity 全绿 |

### 3.3 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `apps/api/src/server.ts` | 低 | `GET /api/admin/metrics` 无鉴权（SEC-001 advisory，生产前补齐） |
| **S2** | `apps/api/src/repository/memory-repo.ts` | 低 | 记忆提取每次对话都触发（额外 LLM 调用），成本与价值未做阈值控制（PRD BLOCKING Q&A Q1） |

---

## 4. 结论

**评审结论: APPROVED (回溯，代码质量通过，流程违规已记录)**

### 总评

R7 是 PersonaChat 从"demo 级"到"产品级"的关键跃迁：流式输出、对话分支、评价反馈、人格记忆、LLM 可观测性五大特性一次性交付。代码质量通过 trinity 验证，11 个 AC E2E 用例 + F4/F5 单元测试覆盖完整。

**关键贡献**:
- D8 SSE 流式（Web Streams API，零缓冲）
- D10 对话分支（parent_record_id + branch_index，无新表）
- D11 评价反馈（单表 rating + SQL 聚合，无写放大）
- D12 人格记忆（关键词匹配，零向量数据库依赖）
- D13 LLM 可观测性（自建 llm_call_logs，零 SaaS 依赖）
- chat-svc.ts 拆分 chat-helpers.ts（保持 ≤300 行）

**流程违规**:
- PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 跳过 BA → Tech Lead → test-writer → impl-writer → Reviewer 五角色流程
- 教训 L17: Plan Mode ≠ Spec 文档；L18: 多轮连续交付时容易进入"流水线模式"

**反推**:
- AGENTS.md 增加"Step 0: 编码前自查清单"
- 新增 AI-008 轮次完整门禁（PRD/Tech-Spec/round-delta/retro/lessons-learned 五项必填）
- AI-001/002/003/007 升级为 machine-enforced（R12 落地）

**批准状态**: 本轮代码回溯评估通过。流程违规已在 R11/R12 通过规则升级修复。
