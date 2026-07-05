# PRD: AI Native 深度体验 (Round 7)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 7 (已交付)

---

## 一、需求背景

PersonaChat 已完成基础设施搭建（四层架构、SSOT 契约、7 门禁管线），但产品体验仍停留在"demo 级"：对话需等待完整响应（无流式）、对话是线性的（无分支）、没有反馈机制（不知道质量）、人格是静态的（无记忆）、LLM 调用黑盒（无观测）。本次 Round 要将产品体验从 40 分提升到 80 分。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-701 | 作为用户，我希望对话能逐字流式输出，而不是等 8 秒一次返回 |
| US-702 | 作为用户，我希望对不满意的回复可以"重新生成"，不丢失之前的分支 |
| US-703 | 作为用户，我希望对 AI 回复点赞/踩，帮助系统改进 |
| US-704 | 作为用户，我希望人格能记住之前对话中提到的重要信息 |
| US-705 | 作为开发者，我希望看到 LLM 调用的延迟、token 消耗、错误率 |

## 三、功能需求

### F1: 流式输出 (SSE Streaming)
- 新路由 `POST /api/chats/stream`，返回 `text/event-stream`
- 小程序使用 `wx.request({ enableChunked: true })` 逐块接收
- SSE 事件类型: delta / done / error
- 流式结束后异步保存完整消息到 D1
- 保留原有非流式 `POST /api/chats` 向后兼容

### F2: 对话分支 (Conversation Branching)
- `chat_records` 表新增 `parent_record_id` + `branch_index` 字段
- 用户"重新生成"时，新记录共享同一 parent_record_id，branch_index 递增
- `GET /api/chats/branches/:recordId` 查询分支列表
- 前端展示分支指示器 🔄

### F3: 评价反馈
- `chat_records` 新增 `rating` 字段 (like/dislike)
- `PUT /api/chats/:id/rate` 评分路由
- `GET /api/personas/:id/stats` 人格统计（总消息数/好评率/对话数）
- 前端展示 👍👎 按钮

### F4: 人格记忆
- 新建 `persona_memories` 表 (key-value, 按 importance+recency 排序)
- 每次对话后异步提取关键事实（额外 LLM 调用）
- 下次对话前注入相关记忆到 system prompt
- 关键词匹配检索，无需向量数据库

### F5: LLM 可观测性
- 新建 `llm_call_logs` 表记录每次调用的 model/provider/latency/tokens/status
- `GET /api/admin/metrics?period=N` 返回聚合指标
- `callLLM` 内插桩记录日志

## 四、验收标准 (AC)

### AC-F1: 流式输出

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.1 | 有效 personaId + messages | POST /api/chats/stream | 返回 200 + text/event-stream (测试 R7) |
| AC-F1.2 | 流式响应体 | 读取 SSE body | 包含 delta 事件 + done 事件 (测试 R8) |
| AC-F1.3 | 缺少 messages | POST /api/chats/stream | 返回 400 (测试 R9) |
| AC-F1.4 | persona 不存在 | POST /api/chats/stream | 返回 404 (测试 R10) |

### AC-F2: 对话分支

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.1 | 有效请求 + parentRecordId=5 | POST /api/chats | 返回 200 (测试 R13) |
| AC-F2.2 | 父记录有 2 个分支 | GET /api/chats/branches/10 | 返回 2 条，branchIndex=0,1 (测试 R14) |
| AC-F2.3 | 不存在的记录 | GET /api/chats/branches/999 | 返回 404 (测试 R15) |

### AC-F3: 评价反馈

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.1 | 有效记录 | PUT /api/chats/10/rate {rating:'like'} | 返回 200 (测试 R16) |
| AC-F3.2 | 不存在的记录 | PUT /api/chats/999/rate | 返回 404 (测试 R17) |
| AC-F3.3 | 无效 rating | PUT /api/chats/1/rate {rating:'invalid'} | 返回 400 (测试 R18) |
| AC-F3.4 | persona 有 80/20 好评 | GET /api/personas/karpathy/stats | likeRate=0.8, totalMessages=100 (测试 R19) |

### AC-F4: 人格记忆
- 多次对话后，人格能引用之前提到的关键信息（需集成测试，当前仅单元级验证）

### AC-F5: 可观测性
- `GET /api/admin/metrics` 返回 model/providers/calls/tokens/errorRate（手动验证）

## 五、测试映射

| PRD AC | 测试 ID | 测试文件 |
|--------|---------|---------|
| AC-F1.1 | R7 | chat.e2e.test.ts |
| AC-F1.2 | R8 | chat.e2e.test.ts |
| AC-F1.3 | R9 | chat.e2e.test.ts |
| AC-F1.4 | R10 | chat.e2e.test.ts |
| AC-F2.1 | R13 | chat.e2e.test.ts |
| AC-F2.2 | R14 | chat.e2e.test.ts |
| AC-F2.3 | R15 | chat.e2e.test.ts |
| AC-F3.1 | R16 | chat.e2e.test.ts |
| AC-F3.2 | R17 | chat.e2e.test.ts |
| AC-F3.3 | R18 | chat.e2e.test.ts |
| AC-F3.4 | R19 | chat.e2e.test.ts |
