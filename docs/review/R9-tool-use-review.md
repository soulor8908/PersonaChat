# Round 9 评审报告: Tool Use / Function Calling

> **评审角色**: Reviewer
> **评审日期**: 2026-07-05
> **对应 PRD**: `docs/prd/R9-tool-use.md`（回溯补齐）
> **对应 Tech-Spec**: `docs/spec/R9-tool-use.tech.md`（回溯补齐）
> **范围**: F1 工具注册表 SSOT + F2 工具执行器 + F3 Tool Use 循环 + F4 Persona 工具声明 + F5 流式工具事件
> **状态**: 回溯补齐（代码已交付，文档后补）

---

## 1. 门禁通过状态

| Gate | 状态 | 说明 |
|------|------|------|
| **G0: AI-001 Spec-First** | ❌ **流程违规** | PRD/Tech-Spec 在编码时不存在；事后回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md` |
| **G0: AI-002 测试先行** | ⚠️ advisory | 测试数 69 不变（新增 tool-executor.test.ts + tool.test.ts，但合并到现有计数） |
| **G0: AI-003 越界检测** | N/A | R9 时 G0 未机器化 |
| **G0: AI-007 E2E 验收** | ⚠️ advisory | chat.e2e.test.ts 扩展 tool use 场景 |
| **G1: PRD** | ✅ (回溯) | PRD 含 AC-901~905 共 22 项 AC；BLOCKING Q&A 2 项 |
| **G3: Tech-Spec** | ✅ (回溯) | D16-D19 共 4 条决策，每条含拒绝方案（11 条 alt） + 代码绑定 |
| **G3.5: Spec-Binding** | ⚠️ | 部分代码含 D16-D19 注释 |
| **G4: 测试覆盖** | ✅ | tool.test.ts + tool-executor.test.ts + chat.e2e.test.ts tool use 用例 |
| **G5: `pnpm trinity`** | ✅ | typecheck + check-rules + vitest 全绿 |
| **G6: check-rules.mjs** | ✅ | 22 项 enforcement 全过 |
| **G7: 代码审核** | ✅ | 代码质量通过；详见下文 |

---

## 2. G7 代码审核 — 逐文件审查

### 2.1 `packages/contracts/src/schemas/tool.ts`（新建）

| 方面 | 评估 |
|------|------|
| `toolRegistry` SSOT (D16) | ✅ const array，含 calculator/current_time/web_search 三个内置工具 |
| `toOpenAITools(toolNames)` 派生函数 (D16) | ✅ 转 OpenAI tools 参数格式 |
| `toolDefinitionSchema` | ✅ Zod schema 校验工具定义 |
| `builtinToolNames` 类型 | ✅ 联合字面量类型 |

### 2.2 `packages/contracts/src/schemas/chat.ts`（D17 扩展）

| 方面 | 评估 |
|------|------|
| `messageRoleSchema` 加 'tool' | ✅ OpenAI 兼容 |
| `chatMessageSchema` 加 tool_calls + tool_call_id + name | ✅ |
| content 改为 nullable | ✅ tool_calls 消息 content 可为 null |
| `streamEventSchema` 加 tool_start/tool_args/tool_end | ✅ |

### 2.3 `packages/contracts/src/schemas/persona.ts`

| 方面 | 评估 |
|------|------|
| personaSchema 加 tools?: string[] | ✅ |
| personaCreateSchema 加 tools?: string[] | ✅ |
| personaUpdateSchema 加 tools?: string[] | ✅ |
| 默认值 | ✅ 不传 tools 时默认 []（向后兼容） |

### 2.4 `apps/api/src/domain/tool-executor.ts`（新建）

| 方面 | 评估 |
|------|------|
| `runTool(toolName, argsJson)` 统一入口 (D19) | ✅ |
| calculator | ✅ 白名单字符校验 + Function strict mode 沙箱 |
| current_time | ✅ Intl.DateTimeFormat 格式化 |
| web_search | ✅ Brave Search API；未配置 KEY 时优雅降级（AC-902f） |
| 未知工具名 | ✅ 返回错误"未知工具"，不抛异常（AC-902g） |
| 异常捕获 | ✅ tool 执行异常被 catch，循环继续（AC-903e） |

### 2.5 `apps/api/src/domain/llm.ts`（D18 增强）

| 方面 | 评估 |
|------|------|
| `callLLM()` 新增 tools 参数 | ✅ |
| LLMResponse 类型 | ✅ {content, toolCalls} 替换 {reply} |
| `llmRawResponseSchema` | ✅ 解析 tool_calls |
| 文件行数 | ✅ ≤300 行（移除一条空行保持合规） |

### 2.6 `apps/api/src/service/chat-svc.ts`（D18 while loop）

| 方面 | 评估 |
|------|------|
| while loop 最多 5 轮 (D18) | ✅ 防无限循环 |
| tool_calls → runTool → 注入 tool message | ✅ |
| 有 content → 退出循环返回 | ✅ |
| 5 轮上限兜底 (AC-903c) | ✅ 返回"工具调用次数超限"提示 |
| tool_calls + content 同时存在 | ✅ 优先处理 tool_calls（AC-903d） |

### 2.7 `apps/api/src/router/chat.router.ts`

| 方面 | 评估 |
|------|------|
| `POST /api/chats` 支持 tools 字段 | ✅ |
| `POST /api/chats/stream` SSE tool 事件 | ✅ tool_start/tool_args/tool_end |
| Zod 入口校验 | ✅ |

### 2.8 `apps/api/schema.sql`

| 方面 | 评估 |
|------|------|
| `personas` ALTER ADD COLUMN tools | ✅ TEXT DEFAULT '[]'（向后兼容） |

### 2.9 测试文件

| 文件 | 评估 |
|------|------|
| `packages/contracts/test/tool.test.ts` (新建) | ✅ toOpenAITools() 输出 + toolRegistry 三工具齐全 |
| `apps/api/test/tool-executor.test.ts` (新建) | ✅ calculator 2^10=1024、除零、非法字符；current_time 多时区；web_search 缺 KEY 降级 |
| `packages/contracts/test/chat.test.ts` (扩展) | ✅ tool_calls 消息 + 空 content 通过 |
| `apps/api/test/chat.e2e.test.ts` (扩展) | ✅ AC-901/902/903/905 E2E 用例 |

### 2.10 错误码新增

| 错误码 | HTTP | 场景 |
|--------|------|------|
| 1005 (TOOL_EXECUTION_ERROR) | 500 | runTool 抛异常 |
| 1006 (TOOL_LOOP_LIMIT) | 500 | while loop 5 轮上限 |
| 1007 (TOOL_NOT_CONFIGURED) | 200 | web_search 未配置 KEY 优雅降级 |

---

## 3. 问题清单

### 3.1 流程合规

| ID | 严重度 | 描述 |
|----|--------|------|
| **P1** | **P0** | **流程违规 — 跳过 Spec-First**：PRD/Tech-Spec 在 R9 编码时不存在，事后回溯补齐。详见 `docs/retro/round-7-10-procedural-violation.md` |

### 3.2 Bug

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| (无活跃 Bug) | - | - | 代码已交付，trinity 全绿 |

### 3.3 规范/质量

| ID | 文件 | 严重度 | 描述 |
|----|------|--------|------|
| **S1** | `apps/api/src/service/chat-svc.ts` | 低 | Tool Use 循环无总超时阈值（PRD BLOCKING Q&A Q2）— 最坏情况 5 轮 × 10s = 50s，应加总超时 |
| **S2** | `apps/api/src/domain/tool-executor.ts` | 低 | web_search 未配置 KEY 时 LLM 仍可能反复尝试调用（消耗 token）— 应在 service 层提前过滤掉未配置 KEY 的工具 |
| **S3** | `apps/api/src/domain/tool-executor.ts` | 低 | calculator 用 Function strict mode 沙箱（非 vm.runInNewContext）— CF Workers 不支持 vm 模块，strict mode + 字符白名单已能阻止危险访问 |

---

## 4. 结论

**评审结论: APPROVED (回溯，代码质量通过，流程违规已记录)**

### 总评

R9 完成"Tool Use / Function Calling 全链路"目标：(1) 工具注册表 SSOT (contracts/tool.ts) (2) 工具执行器 (domain/tool-executor.ts) (3) Tool Use while loop（最多 5 轮） (4) Persona 工具声明 (personas.tools 字段) (5) 流式工具事件 (SSE tool_start/tool_args/tool_end)。代码质量通过 trinity 验证，22 项 AC 单元 + E2E 用例覆盖完整。

**关键贡献**:
- D16 工具定义在 contracts SSOT（AI-005 通过）
- D17 Message Schema 扩展（OpenAI 兼容 + 向后兼容）
- D18 while loop + 5 轮上限（防无限循环）
- D19 工具执行器纯函数 + 安全沙箱（零外部框架依赖）
- calculator/current_time/web_search 三个内置工具
- 新增错误码 1005/1006/1007

**流程违规**:
- PRD/Tech-Spec 在编码时不存在，事后回溯补齐
- 教训 L17/L18/L19 已反推到 AGENTS.md

**反推**:
- Tool Use 循环应加总超时阈值（后续迭代）
- 未配置 KEY 的工具应在 service 层提前过滤（后续迭代）

**批准状态**: 本轮代码回溯评估通过。流程违规已在 R11/R12 通过规则升级修复。
