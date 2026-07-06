# Tech-Spec: Tool Use / Function Calling (Round 9)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R9-tool-use.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D16** | 工具定义在 contracts SSOT，`toOpenAITools()` 派生 OpenAI 格式 | AI-005 禁止硬编码，下游代码不直接引用工具定义 | `packages/contracts/src/schemas/tool.ts` → `toolRegistry` + `toOpenAITools()` |
| **D17** | Message Schema 扩展：content 改为 nullable，新增 tool_calls/tool_call_id/name | OpenAI 兼容格式；向后兼容（无 tool_calls 时 content 必填） | `packages/contracts/src/schemas/chat.ts` → `messageRoleSchema` / `chatMessageSchema` |
| **D18** | Tool Use 循环在 service 层 while loop，最多 5 轮 | 不引入状态机；5 轮上限防无限循环 | `apps/api/src/service/chat-svc.ts` → `chat()` while loop |
| **D19** | 工具执行在 `domain/tool-executor.ts`，不依赖任何外部框架 | 领域层纯函数；安全沙箱（calculator 白名单校验 + Function strict mode） | `apps/api/src/domain/tool-executor.ts` |

### 拒绝方案

| 方案 | 拒绝理由 |
|------|---------|
| D16 alt A: 在 service 层硬编码 `[{name:'calculator',...}]` | 违反 AI-005 SSOT；新增工具需改 service 代码且 contract 层无类型保护。SSOT + 派生函数让前端通过 `/api/models` 或 contracts 类型直接拿到工具列表。 |
| D16 alt B: 后端通过 `/api/tools` 动态注册（运行时新增工具） | 当前工具集为编译期固定（calculator/current_time/web_search），运行时注册引入状态且无编译期类型保证。无运行时可变性需求。 |
| D17 alt A: 新建独立 `toolMessageSchema` 而非扩展现有 `chatMessageSchema` | OpenAI 协议中 assistant 和 tool 消息共用 message 数组，分离 schema 会让 message 数组类型变为 `ChatMessage \| ToolMessage` 联合，下游消费复杂度上升。 |
| D17 alt B: content 保持必填，tool_calls 字段加在 messages 之外 | 不符合 OpenAI Function Calling 规范，无法直接对接 OpenAI SDK，且 client.mock 测试需特判。 |
| D18 alt A: 引入 XState 状态机管理 tool loop | 状态机带来正确性收益但增加依赖（XState ~30KB），且 tool loop 只有 2 个状态（idle / calling-tool），while loop + max iterations 已足够。 |
| D18 alt B: 递归调用 `chat()` 而非 while loop | 递归深度由 LLM 决定，理论上可堆栈溢出；CF Workers 调用栈有上限。显式 while + counter 更安全可控。 |
| D18 alt C: 不设上限，依赖 LLM 自然终止 | 模型可能进入死循环（互相调用工具不收敛），5 轮上限是兜底防御，符合"防无限循环"原则。 |
| D19 alt A: 引入 LangChain Tool 抽象层 | LangChain 引入 200KB+ 依赖，违背"模板零依赖"原则。calculator 等工具纯函数即可实现，无需框架。 |
| D19 alt B: calculator 用 `vm.runInNewContext` 沙箱 | `vm` 模块在 CF Workers 中不可用。Function strict mode + 字符白名单已能阻止 `require`/`process` 等危险访问。 |
| D19 alt C: web_search 直接 `fetch(brave.com/...)?q=` 抓 HTML | HTML 解析脆弱且 Brave 官方 API 有结构化 JSON 输出 + 速率配额。API key 缺失时优雅降级是已设计的容错路径。 |

---

## 二、数据模型变更

### personas 表
```sql
ALTER TABLE personas ADD COLUMN tools TEXT DEFAULT '[]';  -- JSON array of tool names
```

### Persona Schema 扩展
```typescript
// tools?: string[]（创建/更新/实体均扩展）
```

## 三、路由设计

| 方法 | 路径 | 变更 | Dx |
|------|------|------|----|
| POST | `/api/chats` | 增强：支持 tools 传递 | D18 |
| POST | `/api/chats/stream` | SSE 事件增加 tool_start/args/end | D18 |

## 四、契约层变更

| 文件 | 变更 |
|------|------|
| `packages/contracts/src/schemas/tool.ts` | **新建**：toolRegistry SSOT + toOpenAITools() |
| `packages/contracts/src/schemas/chat.ts` | messageRoleSchema 加 'tool'；chatMessageSchema 加 tool_calls + tool_call_id + name + content nullable；streamEventSchema 加 tool_start/tool_args/tool_end |
| `packages/contracts/src/schemas/persona.ts` | personaSchema + personaCreateSchema + personaUpdateSchema 加 tools?: string[] |

## 五、领域层变更

| 文件 | 变更 |
|------|------|
| `apps/api/src/domain/tool-executor.ts` | **新建**：runTool() 统一入口 |
| `apps/api/src/domain/llm.ts` | callLLM 新增 tools 参数；LLMResponse 返回类型 {content, toolCalls} 替换 {reply}；llmRawResponseSchema 解析 tool_calls |

## 六、文件拆分

`apps/api/src/domain/llm.ts` — 最终 300 行（移除一条空行保持合规）

---

## 七、错误码定义

| 错误码 | HTTP | 场景 |
|--------|------|------|
| 1002 (VALIDATION_ERROR) | 400 | persona.tools 数组中含未知工具名（非 calculator/current_time/web_search 之一）；tool_calls 参数 JSON 解析失败 |
| 1005 (TOOL_EXECUTION_ERROR) | 500 | `runTool()` 执行过程中抛出异常（calculator 表达式语法错误、Function 沙箱拒绝、web_search API 调用失败且未走优雅降级路径） |
| 1006 (TOOL_LOOP_LIMIT) | 500 | while loop 达到 5 轮上限仍未收敛到 content 响应（AC-905） |
| 1007 (TOOL_NOT_CONFIGURED) | 200 | web_search 调用时 `WEB_SEARCH_API_KEY` 未配置，返回优雅降级提示（不报 5xx） |

> 注：TOOL_EXECUTION_ERROR (1005)、TOOL_LOOP_LIMIT (1006)、TOOL_NOT_CONFIGURED (1007) 为本轮新增错误码。其中 1007 返回 200 状态码（业务正常返回，仅消息体告知用户功能未启用）。

---

## 八、变更清单

### 新增文件

| 文件路径 | 功能 | Dx |
|---------|------|----|
| `packages/contracts/src/schemas/tool.ts` | toolRegistry SSOT + toOpenAITools() 派生函数 + toolDefinitionSchema | D16 |
| `apps/api/src/domain/tool-executor.ts` | runTool() 统一入口；calculator / current_time / web_search 三个执行函数 | D19 |
| `packages/contracts/test/tool.test.ts` | 验证 toOpenAITools() 输出符合 OpenAI 格式；toolRegistry 三工具齐全 | D16 |
| `apps/api/test/tool-executor.test.ts` | calculator 正常/边界/错误；current_time 时区；web_search 优雅降级 | D19 |

### 修改文件

| 文件路径 | 变更内容 | 行数 |
|---------|---------|------|
| `packages/contracts/src/schemas/chat.ts` | messageRoleSchema 加 'tool'；chatMessageSchema 加 tool_calls + tool_call_id + name + content nullable；streamEventSchema 加 tool_start/tool_args/tool_end | - |
| `packages/contracts/src/schemas/persona.ts` | personaSchema/personaCreateSchema/personaUpdateSchema 加 tools?: string[] | - |
| `apps/api/src/domain/llm.ts` | callLLM 新增 tools 参数；LLMResponse {content, toolCalls}；llmRawResponseSchema 解析 | ≤300 |
| `apps/api/src/service/chat-svc.ts` | chat() 加 while loop（≤5 轮）；tool_calls → runTool → 注入 tool message → 继续 LLM | ≤300 |
| `apps/api/src/router/chat.router.ts` | `POST /api/chats` 与 `/stream` 路由支持 tools 字段；SSE 发送 tool_start/args/end 事件 | ≤300 |
| `apps/api/schema.sql` | personas ALTER ADD COLUMN tools TEXT DEFAULT '[]' | - |
| `apps/api/test/chat.e2e.test.ts` | 扩展 tool use 场景：AC-901 calculator + current_time；AC-903 无 tools 行为不变；AC-905 5 轮上限兜底 | - |
| `packages/contracts/test/chat.test.ts` | 更新"空 content 不再拒绝"测试（tool_calls 场景） | - |

### 删除文件

(无)

---

## 九、测试策略

> **修正 PRD "无新增测试" 的歧义**：PRD 原文 "Round 9 无新增独立测试（改为适配已有测试）" 与 AI-002 测试先行原则冲突。本 Tech-Spec 明确：本轮新增 4 个测试文件 + 扩展 2 个已有测试，覆盖 AC-901 至 AC-905 全部 5 条 AC。

| 测试类型 | 文件 | 覆盖功能 | AC |
|---------|------|---------|----|
| **单元 — Contracts** | `packages/contracts/test/tool.test.ts` | toOpenAITools() 输出符合 OpenAI 格式；toolRegistry 三工具齐全；toolDefinitionSchema.parse 校验 | D16 |
| **单元 — Tool Executor** | `apps/api/test/tool-executor.test.ts` | calculator 2^10=1024、除零、非法字符；current_time 多时区；web_search 缺 API key 优雅降级 | AC-901, AC-902, AC-904 |
| **E2E — Tool Use 循环** | `apps/api/test/chat.e2e.test.ts` | persona 含 tools=[calculator,current_time]，问"现在几点了" → LLM 调用 current_time 返回正确时间 | AC-901, AC-902 |
| **E2E — 向后兼容** | `apps/api/test/chat.e2e.test.ts` | persona.tools 为空 → 行为与 R8 完全一致（无 tool_calls 注入） | AC-903 |
| **E2E — Loop 上限** | `apps/api/test/chat.e2e.test.ts` | mock LLM 始终返回 tool_calls（不收敛）→ 5 轮后返回兜底消息 | AC-905 |
| **单元 — Schema** | `packages/contracts/test/chat.test.ts` | chatMessageSchema 接受 assistant+tool_calls、tool 角色消息；空 content + tool_calls 通过；纯 content 通过 | D17 |

### 关键测试场景

```
AC-901 (current_time 工具):
  ✓ persona.tools=["calculator","current_time"]
  ✓ 用户问"现在几点了" → LLM 返回 tool_calls=[{name:'current_time', args:{}}]
  ✓ runTool('current_time', '{}') 返回当前时间字符串
  ✓ 第二轮 LLM 收到 tool 结果 → 返回自然语言回复
  ✓ 回复包含时间信息

AC-902 (calculator 工具):
  ✓ 用户问"2 的 10 次方" → LLM tool_calls=[{name:'calculator', args:{expr:'2**10'}}]
  ✓ runTool('calculator', '{"expr":"2**10"}') 返回 "1024"
  ✓ 第二轮 LLM 回复"2 的 10 次方等于 1024"

AC-903 (向后兼容):
  ✓ persona 不含 tools 字段（旧数据）→ chat() 行为与 R8 完全一致
  ✓ callLLM 调用不传 tools 参数
  ✓ 不会触发 while loop（直接返回 content）

AC-904 (web_search 优雅降级):
  ✓ WEB_SEARCH_API_KEY 未配置
  ✓ LLM tool_calls=[{name:'web_search', args:{q:'...'}}]
  ✓ runTool 返回 {error: "搜索功能未配置"} (TOOL_NOT_CONFIGURED 1007)
  ✓ 第二轮 LLM 收到降级消息 → 回复"搜索功能未配置，请联系管理员"

AC-905 (Loop 上限):
  ✓ mock LLM 始终返回 tool_calls=[{name:'calculator', args:{expr:'1+1'}}]
  ✓ 5 轮后退出 while loop
  ✓ 返回兜底消息"工具调用次数超限，请简化请求"
```

---

## 十、迁移/回滚方案

### 迁移步骤

1. 在 D1 执行 `apps/api/schema.sql` 新增段落：
   ```sql
   ALTER TABLE personas ADD COLUMN tools TEXT DEFAULT '[]';
   ```
2. 部署新版本 Worker（旧 personas 行 tools 默认 '[]'，行为不变）
3. 旧客户端不传 tools 字段 → 后端走原 chat() 路径，向后兼容

### 回滚步骤

```bash
# 1. 通过 git revert 回滚应用代码
git revert <round-9-commit-hash>

# 2. 在 D1 控制台执行回滚 SQL
ALTER TABLE personas DROP COLUMN tools;
```

回滚影响：
- 旧版代码不读取 tools 字段，DROP COLUMN 无副作用
- 已有的 personas 行的 tools 数据丢失（可接受 — 工具声明可重新配置）
- chat_records 中已写入的 tool_calls 消息仍保留在 messages JSON 中（旧版 chat 不解析 tool_calls 字段，作为普通 content 显示，体验降级但不报错）
