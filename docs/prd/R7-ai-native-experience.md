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

### Out of Scope

| 条目 | 原因 |
|------|------|
| 向量数据库 / 语义检索（pinecone/chroma） | D12 决策：关键词匹配即可，零依赖 |
| 多模态输入（图片/语音） | 非本轮范围 |
| 对话导出（PDF/Markdown） | 非本轮范围 |
| 跨人格记忆共享 | 隐私边界，本轮按 persona_id 隔离 |
| 自适应 prompt 重写 | R9 Tool Use 才引入 LLM 主动调用 |
| Admin 鉴权 | SEC-001 advisory，metrics 暂公开（生产前补鉴权） |
| 评价反馈的聚合分析（如 NLP 情感分析 dislike 原因） | 仅记录原始 like/dislike，不做下游分析 |

## 四、验收标准 (AC)

### AC-F1: 流式输出

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.1 | 有效 personaId + messages | POST /api/chats/stream | 返回 200 + text/event-stream (测试 R7) |
| AC-F1.2 | 流式响应体 | 读取 SSE body | 包含 delta 事件 + done 事件 (测试 R8) |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.3 | 缺少 messages | POST /api/chats/stream | 返回 400 (测试 R9) |
| AC-F1.4 | persona 不存在 | POST /api/chats/stream | 返回 404 (测试 R10) |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F1.5 | LLM 服务端返回 5xx | POST /api/chats/stream | SSE 推送 error 事件，流关闭 |
| AC-F1.6 | 客户端中断读取 | 流被取消 | accumulateReply 捕获异常，不阻塞 onComplete |

### AC-F2: 对话分支

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.1 | 有效请求 + parentRecordId=5 | POST /api/chats | 返回 200 (测试 R13) |
| AC-F2.2 | 父记录有 2 个分支 | GET /api/chats/branches/10 | 返回 2 条，branchIndex=0,1 (测试 R14) |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.3 | 不存在的记录 | GET /api/chats/branches/999 | 返回 404 (测试 R15) |
| AC-F2.4 | 同一 parent 的第 N 次"重新生成" | branch_index 递增 | 新记录 branchIndex = N，不覆盖旧分支 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F2.5 | parentRecordId 指向已删除记录 | POST /api/chats | 由 service 层处理，记录视为无父（branchIndex=0） |

### AC-F3: 评价反馈

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.1 | 有效记录 | PUT /api/chats/10/rate {rating:'like'} | 返回 200 (测试 R16) |
| AC-F3.4 | persona 有 80/20 好评 | GET /api/personas/karpathy/stats | likeRate=0.8, totalMessages=100 (测试 R19) |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.2 | 不存在的记录 | PUT /api/chats/999/rate | 返回 404 (测试 R17) |
| AC-F3.5 | persona 无任何对话记录 | GET /api/personas/:id/stats | likeRate=0, totalMessages=0, totalSessions=0 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F3.3 | 无效 rating | PUT /api/chats/1/rate {rating:'invalid'} | 返回 400 (测试 R18) |

### AC-F4: 人格记忆

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F4.1 | 多轮对话中提到"我喜欢 Python" | 下一次对话 | system prompt 中注入相关记忆，人格可引用该事实 |
| AC-F4.2 | 对话结束后 | chatService.chat() | 异步触发 extractMemoriesAsync()，写入 persona_memories |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F4.3 | persona_memories 表为空（新用户） | 下一次对话 | 注入逻辑跳过，system prompt 不变 |
| AC-F4.4 | 单次对话无关键事实可提取 | extractMemoriesAsync | 不写入任何记忆记录（LLM 返回空数组） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F4.5 | 记忆提取 LLM 调用失败 | chat() 主流程 | 不阻断响应；记忆提取失败仅 console.warn，不影响主对话 |
| AC-F4.6 | 记忆注入异常 | system prompt 拼装 | 不阻断响应；用未注入记忆的 prompt 继续

### AC-F5: 可观测性

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F5.1 | 过去 24h 内有 LLM 调用记录 | GET /api/admin/metrics?period=24 | 返回 200 + 含 model/calls/avgLatency/errorRate/totalTokens |
| AC-F5.2 | 每次 callLLM 调用 | setLLMLogger 回调触发 | 写入 llm_call_logs 表（model/provider/latency/tokens/status） |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F5.3 | period=1（最小时段） | GET /api/admin/metrics?period=1 | 仅返回最近 1 小时聚合数据 |
| AC-F5.4 | period=720（最大时段，30 天） | GET /api/admin/metrics?period=720 | 返回 30 天聚合数据 |
| AC-F5.5 | 某模型在窗口内零调用 | GET /api/admin/metrics | 该模型不出现于 models 数组 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-F5.6 | period 超出 [1, 720] | GET /api/admin/metrics?period=1000 | Zod 校验返回 400 |
| AC-F5.7 | llm_call_logs 表写入失败 | setLLMLogger 回调 | 仅 console.warn，不阻断主调用（fire-and-forget） |

## 五、测试映射

| PRD AC | 测试 ID | 测试文件 | 类型 |
|--------|---------|---------|------|
| AC-F1.1 | R7 | chat.e2e.test.ts | 正常 |
| AC-F1.2 | R8 | chat.e2e.test.ts | 正常 |
| AC-F1.3 | R9 | chat.e2e.test.ts | 边界 |
| AC-F1.4 | R10 | chat.e2e.test.ts | 边界 |
| AC-F2.1 | R13 | chat.e2e.test.ts | 正常 |
| AC-F2.2 | R14 | chat.e2e.test.ts | 正常 |
| AC-F2.3 | R15 | chat.e2e.test.ts | 边界 |
| AC-F3.1 | R16 | chat.e2e.test.ts | 正常 |
| AC-F3.2 | R17 | chat.e2e.test.ts | 边界 |
| AC-F3.3 | R18 | chat.e2e.test.ts | 错误 |
| AC-F3.4 | R19 | chat.e2e.test.ts | 正常 |
| AC-F4.1 ~ AC-F4.6 | （单元级） | chat-svc.test.ts + chat.e2e.test.ts（集成） | 单元 + 集成 |
| AC-F5.1 ~ AC-F5.7 | 手动 + chat.e2e.test.ts | server.ts admin 路由手动验证 + Zod 校验 E2E | 集成 + E2E |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: 人格记忆的提取频率与重要性评分阈值？

**问题**: 每次对话后都触发记忆提取（额外一次 LLM 调用）成本与价值如何平衡？importance 字段取值范围与判定规则是什么？是否需要在用户主动触发时才提取，而非每次对话都做？长期记忆的 TTL/淘汰策略是什么？

**建议确认方**: 后端开发 / 产品

### Q2: LLM 可观测性数据（llm_call_logs）的保留时长与 admin metrics 鉴权？

**问题**: `llm_call_logs` 表无限增长，30 天后是否归档/清理？`GET /api/admin/metrics` 当前无鉴权（SEC-001 advisory），生产前是否必须加鉴权？metrics 是否包含 PII（如用户原始 prompt）？

**建议确认方**: 后端开发 / 安全负责人

### Q3: 流式响应中 LLM 5xx 错误的客户端体验？

**问题**: 当 LLM 上游返回 5xx（如 DeepSeek 服务异常），前端应展示什么？是直接显示错误 toast 还是部分展示已收到的 delta？SSE `error` 事件需要包含哪些字段（code/message/是否可重试）？

**建议确认方**: 前端开发 / 后端开发
