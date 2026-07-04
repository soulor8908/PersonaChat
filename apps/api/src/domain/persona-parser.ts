// ── 人格 Markdown 解析领域逻辑（纯函数）──

export interface ParsedPersona {
  id: string
  name: string
  description: string
  systemPrompt: string
}

/**
 * 从 SKILL.md 内容的 GitHub repo 名解析出人格数据
 */
export function parseSkillMd(
  content: string,
  repoName: string,
  sourceUrl: string,
): ParsedPersona {
  const name = extractName(content) || repoName.replace(/-skill$/i, '').trim()
  const systemPrompt = extractSystemPrompt(content) || content.slice(0, 4000)
  const description = extractDescription(content)

  return {
    id: repoName.toLowerCase(),
    name,
    description,
    systemPrompt: systemPrompt.slice(0, 8000),
  }
}

export function extractName(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].replace(/-skill$/i, '').trim() : null
}

export function extractSystemPrompt(content: string): string | null {
  const match = content.match(/#{1,3}\s*System\s+Prompt\s*\n+([\s\S]+)/i)
  return match ? match[1].trim() : null
}

export function extractDescription(content: string, maxLen = 200): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
      return trimmed.slice(0, maxLen)
    }
  }
  return ''
}
