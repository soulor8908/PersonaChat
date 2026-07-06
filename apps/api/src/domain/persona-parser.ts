// ── 人格 Markdown 解析领域逻辑（纯函数）──
// 审计注记 (2026-07-06): 本文件由 R1 monorepo 阶段创建（R1 无 Tech-Spec，见 backrefactor-r3-r6-spec-gap.md），
// R2 增强 extractName fallback 逻辑（R2 PRD F4 + R2 Tech-Spec 变更清单未声明此文件，属历史 Spec 缺口）。
// 不强制加 TECH-XXX-NNN Dxx 注解，因无对应 Dx 决策可直接绑定。

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
