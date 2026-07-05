// ── 工具注册表 SSOT (TECH-CONTRACT-003 D16) ──
// AI-005: 工具定义单一定义，所有下游派生

export const toolRegistry = [
  {
    name: 'calculator',
    description: 'Evaluate a mathematical expression. Supports +, -, *, /, %, ** and parentheses.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'A math expression, e.g. "2 + 3 * 4" or "2**10"' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'current_time',
    description: 'Get the current date and time for a specified timezone.',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone name, e.g. "Asia/Shanghai", "America/New_York"' },
      },
      required: ['timezone'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for current information. Returns top search results as text.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
] as const

export type ToolDefinition = typeof toolRegistry[number]
export const builtinToolNames = toolRegistry.map(t => t.name)
export type BuiltinToolName = typeof builtinToolNames[number]

// 将工具注册表转为 OpenAI tools 参数格式
export function toOpenAITools(toolNames: string[]): Array<{
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}> {
  return toolNames
    .map(name => toolRegistry.find(t => t.name === name))
    .filter((t): t is ToolDefinition => t != null)
    .map(t => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
}
