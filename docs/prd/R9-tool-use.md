# PRD: Tool Use / Function Calling (Round 9)

> **角色**: BA | **状态**: 回溯补齐 | **对应实现**: Round 9 (已交付)

---

## 一、需求背景

PersonaChat 的人格目前只能"说话"，不能"做事"。真正的 AI 助手应该能调用工具（计算、查时间、搜索），这是一个 AI Native 聊天框架的必备能力。需要实现 OpenAI 兼容的 function calling 全链路。

## 二、用户故事

| ID | 故事 |
|----|------|
| US-901 | 作为用户，我希望人格能帮我算数学表达式 |
| US-902 | 作为用户，我希望人格能告诉我当前时间 |
| US-903 | 作为用户，我希望人格能帮我搜索网页 |
| US-904 | 作为人格创建者，我希望指定我的人格可以使用哪些工具 |
| US-905 | 作为用户，我希望在对话中看到工具调用的实时状态 |

## 三、功能需求

### F1: 工具注册表
- 新建 `contracts/tool.ts`：toolRegistry SSOT，定义 calculator/current_time/web_search
- 提供 `toOpenAITools()` 转换函数

### F2: 工具执行器
- 新建 `domain/tool-executor.ts`：`runTool(toolName, argsJson)` 统一入口
- calculator: 白名单字符校验 + Function 沙箱执行
- current_time: Intl.DateTimeFormat 格式化
- web_search: Brave Search API（需 WEB_SEARCH_API_KEY，未配置时优雅降级）

### F3: Tool Use 循环
- `chat()` 方法加入 while loop（最多 5 轮）
- LLM 返回 tool_calls → 执行工具 → 结果注入消息 → 继续调用 LLM
- 有 content → 返回给用户，结束循环

### F4: Persona 工具声明
- `personas` 表新增 `tools TEXT` 字段（JSON 数组）
- Persona 创建时可选工具，不声明则行为不变（向后兼容）

### F5: 流式工具事件
- SSE 事件新增 tool_start/tool_args/tool_end
- 前端展示 🔧 状态指示器

### Out of Scope

| 条目 | 原因 |
|------|------|
| 自定义工具注册（用户上传工具） | 安全风险，仅限 builtin toolRegistry |
| 工具调用费用统计 / 配额管理 | 由 R7 llm_call_logs 间接覆盖 |
| 多模态工具（如调用 DALL-E 生成图片） | 非本轮范围 |
| 工具调用的鉴权（仅特定人格可用某工具） | 由 personas.tools 字段决定，无独立鉴权 |
| 工具 market / 商店 | 非本轮范围 |
| 第三方 MCP 工具集成 | 非本轮范围 |
| 工具调用结果的持久化（chat_records 中存 tool_calls） | 本轮仅记录最终回复，不存中间 tool_call |

## 四、验收标准 (AC)

### AC-F1: 工具注册表 SSOT

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-901a | `contracts/tool.ts` 已建 | import toolRegistry | 包含 calculator / current_time / web_search 三个内置工具 |
| AC-901b | 已知工具名数组 | 调用 `toOpenAITools(['calculator'])` | 返回 OpenAI tools 参数格式（type: 'function'） |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-901c | 工具名数组为空 `[]` | 调用 `toOpenAITools([])` | 返回空数组（不报错） |
| AC-901d | 工具名数组中含未知工具名 | 调用 `toOpenAITools(['calculator', 'unknown'])` | 仅返回已知工具的转换结果，过滤未知项 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-901e | 业务代码硬编码工具列表（绕过 SSOT） | 静态扫描 | AI-005 advisory warning（建议从 contracts 派生） |

### AC-F2: 工具执行

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-902a | Persona 声明 tools: ["calculator","current_time"] | 用户问"现在几点了" | LLM 调用 current_time 工具 → 返回正确时间 |
| AC-902b | Persona 声明 tools: ["calculator"] | 用户问"2的10次方" | LLM 调用 calculator → 返回 1024 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-902c | Persona 未声明 tools | 用户发送任何消息 | 行为与 Round 8 完全一致（工具不传递） |
| AC-902d | calculator 输入含非白名单字符（如 `;` `import`） | runTool 校验 | 白名单校验失败，返回错误，不执行 |
| AC-902e | current_time 输入非法时区（如 "Foo/Bar"） | runTool 执行 | Intl.DateTimeFormat 抛异常，被捕获返回兜底消息 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-902f | web_search 未配置 API key | LLM 调用 web_search | 返回"搜索功能未配置"提示（优雅降级） |
| AC-902g | runTool 接收未知工具名 | 调用 | 返回错误"未知工具"，不抛异常 |

### AC-F3: Tool Use 循环

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-903a | LLM 返回 tool_calls | service 层 while loop | 执行工具 → 结果注入 → 继续调用 LLM |
| AC-903b | LLM 返回 content（无 tool_calls） | while loop 退出 | 返回最终回复给用户 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-903c | Tool Use 超过 5 轮 | while loop 结束 | 返回最后一次结果或兜底消息 |
| AC-903d | LLM 返回 tool_calls + content 同时存在 | while loop 处理 | 优先处理 tool_calls（content 暂存） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-903e | 工具执行抛异常 | runTool 捕获 | 异常被捕获，工具结果为"工具执行失败"，循环继续 |

### AC-F4: Persona 工具声明

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-904a | personas 表已 ALTER 新增 tools 字段 | 数据库检查 | `tools TEXT DEFAULT '[]'` 列存在 |
| AC-904b | Persona 创建时声明 tools: ["calculator"] | POST /api/personas | 人格创建成功，tools 字段持久化 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-904c | Persona 创建时不传 tools 字段 | POST /api/personas | 行为不变，tools 默认为 `[]`（向后兼容） |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-904d | tools 字段非数组（如 tools: "calculator"） | personaCreateSchema.parse | Zod schema 拒绝，返回 400 |

### AC-F5: 流式工具事件

#### 正常路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-905a | 流式过程中 LLM 调用工具 | SSE 推送 | 包含 tool_start + tool_args + tool_end 事件序列 |

#### 边界条件

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-905b | 流式中断（用户主动 abort） | 工具执行中 | 已执行的工具结果保留，未完成的工具事件丢失 |

#### 错误路径

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-905c | 流式中 tool_args JSON 解析失败 | SSE 推送 | tool_end 携带错误信息，流不中断 |

## 五、测试映射

> **AI-002 测试先行要求**：R9 修改了 `contracts/chat.ts`（新增 tool 角色与 tool_calls 字段），相应测试必须同步改动。下列测试覆盖每条 AC。

| PRD AC | 测试文件 | 测试用例 | 类型 |
|--------|---------|---------|------|
| AC-901a / AC-901b / AC-901c / AC-901d | `packages/contracts/test/chat.test.ts` | "allows null content (for tool_calls messages)" + tool 字段 parse | 单元 |
| AC-902a / AC-902b | `apps/api/test/chat.e2e.test.ts` | R1~R5（callLLM mock 返回 tool_calls 场景） | E2E |
| AC-902c | `apps/api/test/chat.e2e.test.ts` | "R5: no model WHEN chat"（无 tools 行为不变） | E2E |
| AC-902d / AC-902e / AC-902g | `apps/api/test/chat-svc.test.ts` | runTool 边界与错误（单元级） | 单元 |
| AC-902f | `apps/api/test/chat-svc.test.ts` | web_search 未配置 KEY 的降级 | 单元 |
| AC-903a ~ AC-903e | `apps/api/test/chat-svc.test.ts` | while loop 行为（最多 5 轮 + 异常处理） | 单元 |
| AC-904a | `apps/api/schema.sql` 检查 | tools 列存在性 | 静态 |
| AC-904b / AC-904c / AC-904d | `packages/contracts/test/persona.test.ts` | personaCreateSchema + tools 字段 | 单元 |
| AC-905a ~ AC-905c | `apps/api/test/chat.e2e.test.ts` | R7 / R8（SSE tool 事件序列） | E2E |

## 六、BLOCKING Q&A

> 以下为 BA 在编写 PRD 过程中发现的歧义或缺失信息，需要相关方确认后方可推进后续轮次。

### Q1: web_search API key 未配置时的降级策略与限流？

**问题**: `WEB_SEARCH_API_KEY` 未配置时返回"搜索功能未配置"提示，但 LLM 仍可能反复尝试调用 web_search（消耗 token）。是否需要在 service 层提前过滤掉未配置 KEY 的工具？web_search 的 Brave Search API 是否有调用频率限制？搜索结果数量上限是多少？

**建议确认方**: 后端开发 / 安全负责人

### Q2: Tool Use 循环超时阈值与 5 轮上限的合理性？

**问题**: while loop 最多 5 轮，但每轮可能涉及 LLM 调用（5-10s）+ 工具执行（web_search 可能 5s）。最坏情况下 Tool Use 链路总耗时可达 50-75s，是否需要总超时？5 轮上限是否覆盖所有合理使用场景？工具执行失败的循环是否计入轮次？

**建议确认方**: 后端开发 / 产品
