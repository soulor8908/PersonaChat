# Round 9 复盘 — Tool Use / Function Calling

## AC 完成率: 22/22 | 测试覆盖: 69 (新增 tool.test.ts + tool-executor.test.ts) | Blocker: 0 (流程违规 1) | 结论: 代码通过 / 流程违规

## 完成情况

- [x] F1 工具注册表 SSOT — `packages/contracts/src/schemas/tool.ts`（toolRegistry + toOpenAITools）
- [x] F2 工具执行器 — `apps/api/src/domain/tool-executor.ts`（calculator/current_time/web_search）
- [x] F3 Tool Use 循环 — chat-svc.ts while loop（最多 5 轮）
- [x] F4 Persona 工具声明 — personas 表新增 tools TEXT DEFAULT '[]'
- [x] F5 流式工具事件 — SSE tool_start/tool_args/tool_end
- [x] Message Schema 扩展（D17）— messageRoleSchema 加 'tool'，content 改 nullable
- [x] 新增错误码 1005 (TOOL_EXECUTION_ERROR) / 1006 (TOOL_LOOP_LIMIT) / 1007 (TOOL_NOT_CONFIGURED)

## Blocker

1 个流程违规 Blocker（详见 [round-7-10-procedural-violation.md](round-7-10-procedural-violation.md)）：
- **P0 流程违规**：跳过 Spec-First，PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 代码已交付，trinity 全绿，22 项 AC 单元 + E2E 用例覆盖完整

## 教训

- **L17 重申**：Plan Mode 输出的"工具调用方案"被等同于 PRD+Tech-Spec。R9 PRD 原"无新增独立测试（改为适配已有测试）"的歧义被 Tech-Spec 修正——明确新增 4 个测试文件 + 扩展 2 个已有测试。这暴露了 Plan Mode 与 Spec 文档的本质差异：Spec 有 G4 门禁要求测试先行。
- **质量**：D16 工具定义在 contracts SSOT 是 AI-005 通过的关键；D19 工具执行器纯函数 + Function strict mode 沙箱是 CF Workers 环境下 vm 模块不可用的合理替代。
- **遗留**：Tool Use 循环无总超时阈值（最坏 5 轮 × 10s = 50s）；web_search 未配置 KEY 时 LLM 仍可能反复尝试调用 — 均为后续迭代项。

## 反推

- **规则层**：AI-001/002/003/007 升级为 machine-enforced（R12 落地）
- **架构**：D16-D19 共 4 条决策反推到 R9-tool-use.tech.md（已回溯补齐）
- **后续迭代**：Tool Use 循环加总超时阈值；未配置 KEY 的工具在 service 层提前过滤
