# Round 7 复盘 — AI Native 深度体验

## AC 完成率: 25/25 | 测试覆盖: 48→64 (新增 16) | Blocker: 0 (流程违规 1) | 结论: 代码通过 / 流程违规

## 完成情况

- [x] F1 流式输出 (SSE Streaming) — `POST /api/chats/stream` + Web Streams API
- [x] F2 对话分支 (Conversation Branching) — parent_record_id + branch_index
- [x] F3 评价反馈 — `PUT /api/chats/:id/rate` + `GET /api/personas/:id/stats`
- [x] F4 人格记忆 — persona_memories 表 + 关键词匹配 + importance 排序
- [x] F5 LLM 可观测性 — llm_call_logs 表 + `GET /api/admin/metrics`
- [x] chat-svc.ts 拆分 chat-helpers.ts（保持 ≤300 行）
- [x] 新增错误码 1003 (LLM_STREAM_ERROR)

## Blocker

1 个流程违规 Blocker（详见 [round-7-10-procedural-violation.md](round-7-10-procedural-violation.md)）：
- **P0 流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 代码已交付，trinity 全绿，11 个 AC E2E 用例 + F4/F5 单元测试覆盖完整

## 教训

- **L17 — Plan Mode ≠ Spec 文档**：Plan Mode 输出的技术方案不等于 PRD+Tech-Spec。PRD 需要 BA 角色（需求分析、AC 清单），Tech-Spec 需要 Tech Lead 角色（Dx 决策、架构设计），必须分别产出一份独立文档。
- **L18 — 多轮连续交付时容易进入"流水线模式"**：R7-R10 在同一天内连续完成，Agent 进入"流水线模式"，忽略了每轮的质量门。每轮开始前必须检查上一轮文档是否完整。
- **L19 — AGENTS.md 的 Step 0 必须是 Spec 存在性检查**：不能假设前序流程已完成。需在 AGENTS.md 增加"编码前自查清单"。
- **质量**：D12 人格记忆用关键词匹配 + 最近 N 条，零向量数据库依赖；D13 LLM 可观测性自建 llm_call_logs 表，零 SaaS 依赖。这两条决策体现了"开源模板零依赖"原则。

## 反推

- **规则层**：AGENTS.md 增加"Step 0: 编码前自查清单"（PRD/Tech-Spec 存在性检查）
- **规则层**：新增 AI-008 轮次完整门禁（PRD/Tech-Spec/round-delta/retro/lessons-learned 五项必填）
- **规则层**：AI-001/002/003/007 升级为 machine-enforced（R12 落地）
- **流程**：BA → Tech Lead → test-writer → impl-writer → Reviewer 五角色流程必须严格执行
- **架构**：D8-D13 共 6 条决策反推到 R7-ai-native.tech.md（已回溯补齐）
