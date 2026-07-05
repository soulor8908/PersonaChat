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

## 四、验收标准

| # | GIVEN | WHEN | THEN |
|---|-------|------|------|
| AC-901 | Persona 声明 tools: ["calculator","current_time"] | 用户问"现在几点了" | LLM 调用 current_time 工具 → 返回正确时间 |
| AC-902 | Persona 声明 tools: ["calculator"] | 用户问"2的10次方" | LLM 调用 calculator → 返回 1024 |
| AC-903 | Persona 未声明 tools | 用户发送任何消息 | 行为与 Round 8 完全一致（工具不传递） |
| AC-904 | web_search 未配置 API key | LLM 调用 web_search | 返回"搜索功能未配置"提示 |
| AC-905 | Tool Use 超过 5 轮 | while loop 结束 | 返回最后一次结果或兜底消息 |

## 五、测试映射

- Round 9 无新增独立测试（改为适配已有测试，callLLM mock 返回格式变更）
- contracts/chat.test.ts 更新了"空 content 不再拒绝"的测试（tool_calls 场景）
