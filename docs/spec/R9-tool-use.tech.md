# Tech-Spec: Tool Use / Function Calling (Round 9)

> **角色**: Tech Lead | **状态**: 回溯补齐 | **对应 PRD**: R9-tool-use.md

---

## 一、架构决策 (Dx)

| Dx | 决策 | 理由 | 代码绑定 |
|----|------|------|---------|
| **D16** | 工具定义在 contracts SSOT，`toOpenAITools()` 派生 OpenAI 格式 | AI-005 禁止硬编码，下游代码不直接引用工具定义 | `contracts/tool.ts` → `toolRegistry` + `toOpenAITools()` |
| **D17** | Message Schema 扩展：content 改为 nullable，新增 tool_calls/tool_call_id/name | OpenAI 兼容格式；向后兼容（无 tool_calls 时 content 必填） | `contracts/chat.ts` → `messageRoleSchema` / `chatMessageSchema` |
| **D18** | Tool Use 循环在 service 层 while loop，最多 5 轮 | 不引入状态机；5 轮上限防无限循环 | `service/chat-svc.ts` → `chat()` while loop |
| **D19** | 工具执行在 `domain/tool-executor.ts`，不依赖任何外部框架 | 领域层纯函数；安全沙箱（calculator 白名单校验 + Function strict mode） | `domain/tool-executor.ts` |

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
| `contracts/tool.ts` | **新建**：toolRegistry SSOT + toOpenAITools() |
| `contracts/chat.ts` | messageRoleSchema 加 'tool'；chatMessageSchema 加 tool_calls + tool_call_id + name + content nullable；streamEventSchema 加 tool_start/tool_args/tool_end |
| `contracts/persona.ts` | personaSchema + personaCreateSchema + personaUpdateSchema 加 tools?: string[] |

## 五、领域层变更

| 文件 | 变更 |
|------|------|
| `domain/tool-executor.ts` | **新建**：runTool() 统一入口 |
| `domain/llm.ts` | callLLM 新增 tools 参数；LLMResponse 返回类型 {content, toolCalls} 替换 {reply}；llmRawResponseSchema 解析 tool_calls |

## 六、文件拆分

`domain/llm.ts` — 最终 300 行（移除一条空行保持合规）
