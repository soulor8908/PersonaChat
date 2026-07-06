// ── 工具执行器 (TECH-API-015 D19) ──
// 安全执行 LLM tool_calls，不接受 LLM 传入的任意代码
// 注：审计修正 (2026-07-06) — 原注解为 D18，但 R9 Tech-Spec 第一节 D19 明确"工具执行在 domain/tool-executor.ts"，D18 是 chat-svc 的 while loop，故修正为 D19

export interface ToolContext {
  webSearchApiKey?: string
}

// 统一入口：根据工具名 + 参数 JSON 执行
export async function runTool(
  toolName: string,
  argsJson: string,
  ctx: ToolContext = {},
): Promise<string> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>
  } catch {
    return 'Error: Invalid tool arguments JSON'
  }

  switch (toolName) {
    case 'calculator':
      return executeCalculator(String(args.expression ?? ''))
    case 'current_time':
      return executeCurrentTime(String(args.timezone ?? 'UTC'))
    case 'web_search':
      return executeWebSearch(String(args.query ?? ''), ctx.webSearchApiKey)
    default:
      return `Error: Unknown tool '${toolName}'`
  }
}

// ── calculator ──
function executeCalculator(expression: string): string {
  const sanitized = expression.trim()
  if (!sanitized) return 'Error: Expression is empty'
  // 白名单校验：只允许数字、运算符、括号、空格、小数点
  if (!/^[\d+\-*/().%\s]+$/.test(sanitized)) {
    return 'Error: Expression contains invalid characters. Only digits, +, -, *, /, %, **, parentheses allowed.'
  }
  try {
    // 用 Function 严格模式沙箱执行
    const result = Function('"use strict"; return (' + sanitized + ')')() as unknown
    if (typeof result !== 'number' || !isFinite(result)) {
      return 'Error: Result is not a finite number'
    }
    return String(result)
  } catch (e) {
    return `Error: ${(e as Error).message}`
  }
}

// ── current_time ──
function executeCurrentTime(timezone: string): string {
  try {
    const now = new Date()
    const formatted = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    }).format(now)
    return `${formatted} (${timezone})`
  } catch {
    return `Error: Invalid timezone '${timezone}'. Use IANA format like 'Asia/Shanghai'.`
  }
}

// ── web_search ──
async function executeWebSearch(query: string, apiKey?: string): Promise<string> {
  if (!query.trim()) return 'Error: Search query is empty'
  if (!apiKey) {
    return 'Web search is not configured. Set WEB_SEARCH_API_KEY to enable.'
  }
  try {
    // 使用 Brave Search API (免费额度友好)
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      },
    )
    if (!response.ok) {
      return `Search error: HTTP ${response.status}`
    }
    const data = await response.json() as {
      web?: { results?: Array<{ title: string; description: string; url: string }> }
    }
    const results = data.web?.results ?? []
    if (results.length === 0) return 'No search results found.'
    return results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}\n   ${r.url}`)
      .join('\n\n')
  } catch (e) {
    return `Search error: ${(e as Error).message}`
  }
}
