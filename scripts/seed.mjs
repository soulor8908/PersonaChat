#!/usr/bin/env node
// ── 批量人格同步种子数据 ──
// 从 alchaincyf/*-skill 仓库抓取 SKILL.md 并输出 SQL 或 JSON
//
// 用法:
//   node scripts/seed.mjs              # 输出 JSON（可管道导入）
//   node scripts/seed.mjs --sql        # 输出 INSERT SQL

const REPOS = [
  { owner: 'alchaincyf', repo: 'karpathy-skill', category: 'tech_leader' },
  { owner: 'alchaincyf', repo: 'zhang-yiming-skill', category: 'tech_leader' },
  { owner: 'alchaincyf', repo: 'steve-jobs-skill', category: 'tech_leader' },
  { owner: 'alchaincyf', repo: 'elon-musk-skill', category: 'tech_leader' },
  { owner: 'alchaincyf', repo: 'munger-skill', category: 'thinker' },
  { owner: 'alchaincyf', repo: 'feynman-skill', category: 'educator' },
  { owner: 'alchaincyf', repo: 'naval-skill', category: 'thinker' },
  { owner: 'alchaincyf', repo: 'paul-graham-skill', category: 'thinker' },
  { owner: 'alchaincyf', repo: 'zhangxuefeng-skill', category: 'educator' },
  { owner: 'alchaincyf', repo: 'taleb-skill', category: 'thinker' },
]

// ── 解析 SKILL.md（内联版，不依赖 contracts 避免运行时问题）──
function parseSkillMd(content, repoName) {
  const nameMatch = content.match(/^#\s+(.+)$/m)
  const name = nameMatch ? nameMatch[1].replace(/-skill$/i, '').trim() : repoName.replace(/-skill$/i, '').trim()

  const sysMatch = content.match(/#{1,3}\s*System\s+Prompt\s*\n+([\s\S]+)/i)
  const systemPrompt = sysMatch ? sysMatch[1].trim() : content.slice(0, 4000)

  const lines = content.split('\n')
  let description = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
      description = trimmed.slice(0, 200)
      break
    }
  }

  return { id: repoName.toLowerCase(), name, description, systemPrompt: systemPrompt.slice(0, 8000) }
}

async function fetchRepo(owner, repo) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const mode = process.argv.includes('--sql') ? 'sql' : 'json'
  const results = []
  let errors = 0

  console.error(`开始同步 ${REPOS.length} 个人格...\n`)

  for (const { owner, repo, category } of REPOS) {
    process.stderr.write(`  ${owner}/${repo}... `)
    try {
      const content = await fetchRepo(owner, repo)
      const parsed = parseSkillMd(content, repo)
      const now = Date.now()
      const persona = {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        category,
        systemPrompt: parsed.systemPrompt,
        sourceUrl: `https://github.com/${owner}/${repo}`,
        stargazersCount: 0,
        createdAt: now,
        updatedAt: now,
      }
      results.push(persona)
      console.error(`✓ ${persona.name}`)
    } catch (err) {
      errors++
      console.error(`✗ ${err.message}`)
    }
  }

  console.error(`\n完成: ${results.length} 成功, ${errors} 失败`)

  if (mode === 'sql') {
    for (const p of results) {
      const sql = `INSERT OR REPLACE INTO personas (id, name, description, category, system_prompt, source_url, stargazers_count, created_at, updated_at)
VALUES ('${p.id}', '${escapeSql(p.name)}', '${escapeSql(p.description)}', '${p.category}', '${escapeSql(p.systemPrompt)}', '${p.sourceUrl}', ${p.stargazersCount}, ${p.createdAt}, ${p.updatedAt});`
      console.log(sql)
    }
  } else {
    console.log(JSON.stringify(results, null, 2))
  }
}

function escapeSql(s) {
  return s.replace(/'/g, "''")
}

main().catch(console.error)
