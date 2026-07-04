#!/usr/bin/env node
// ── 项目上下文快照生成（升级版） ──
// 输出 docs/context-snapshot.md，含架构速查 + 规则速查表 + 路由表 + 契约速查 + 关键约定
// 供 AI agent 快速了解项目全貌

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT = join(ROOT, 'docs', 'context-snapshot.md')

// ── 数据采集 ──
function gather() {
  const info = {}

  // 规则统计
  const rulesDir = join(ROOT, '.trae', 'rules')
  info.ruleCount = 0
  info.rules = [] // { id, title, file, category, severity, enforcement }
  info.ruleCategories = {}

  if (existsSync(rulesDir)) {
    const ruleFiles = walkDir(rulesDir).filter(f => f.endsWith('.md'))
    info.ruleCount = ruleFiles.length

    for (const f of ruleFiles) {
      const content = readFileSync(f, 'utf-8')
      const idMatch = content.match(/rule_id:\s*([A-Z]+-\d+)/)
      const titleMatch = content.match(/title:\s*([^\n]+)/)
      const severityMatch = content.match(/severity:\s*(\w+)/)
      const catMatch = f.match(/rules[\/\\]([^\/\\]+)[\/\\]/)
      const validationSection = content.match(/##\s*校验方式[\s\S]*?(?=##\s|\n---|$)/)
      const hasMachine = validationSection && /check-rules\.mjs|tsc|vitest|ci\.yml|eslint|grep|regex|静态分析|结构检查|三件套|typecheck|wc/i.test(validationSection[0])

      const rule = {
        id: idMatch?.[1] || '?',
        title: titleMatch?.[1]?.trim() || '(无标题)',
        category: catMatch?.[1] || '?',
        severity: severityMatch?.[1] || '?',
        machineCheck: hasMachine || false,
      }
      info.rules.push(rule)

      // 分类统计
      if (!info.ruleCategories[rule.category]) info.ruleCategories[rule.category] = 0
      info.ruleCategories[rule.category]++
    }
  }

  // contracts 统计
  const contractsDir = join(ROOT, 'packages', 'contracts', 'src')
  info.contractCount = 0
  info.contracts = [] // { name, file, fields }

  if (existsSync(contractsDir)) {
    const contractFiles = walkDir(contractsDir).filter(f => f.endsWith('.ts'))
    info.contractCount = contractFiles.length

    for (const f of contractFiles) {
      const content = readFileSync(f, 'utf-8')
      const schemaNames = [...content.matchAll(/export\s+const\s+(\w+Schema)/g)]
        .map(m => m[1])
      const typeNames = [...content.matchAll(/export\s+type\s+(\w+)\s*=/g)]
        .map(m => m[1])

      info.contracts.push({
        file: relative(contractsDir, f),
        schemas: schemaNames,
        types: typeNames,
      })
    }
  }

  // 路由表
  info.routes = []
  const routerDir = join(ROOT, 'apps', 'api', 'src', 'router')
  if (existsSync(routerDir)) {
    const routeFiles = walkDir(routerDir).filter(f => f.endsWith('.ts'))
    for (const f of routeFiles) {
      const content = readFileSync(f, 'utf-8')
      const routes = [...content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g)]
      for (const r of routes) {
        info.routes.push({
          method: r[1].toUpperCase(),
          path: r[2],
          file: relative(join(routerDir, '..'), f),
        })
      }
    }
    // 手动添加 health 端点
    info.routes.push({ method: 'GET', path: '/api/health', file: 'server.ts' })
  }

  // API 源文件
  const apiSrc = join(ROOT, 'apps', 'api', 'src')
  info.apiCount = 0
  if (existsSync(apiSrc)) {
    info.apiCount = walkDir(apiSrc).filter(f => f.endsWith('.ts')).length
  }

  // Spec / 文档 / CI
  info.specCount = existsSync(join(ROOT, 'docs', 'spec'))
    ? walkDir(join(ROOT, 'docs', 'spec')).filter(f => f.endsWith('.md')).length : 0

  info.e2eCount = 0
  const testDir = join(ROOT, 'apps', 'api', 'test')
  if (existsSync(testDir)) {
    info.e2eCount = walkDir(testDir).filter(f => f.endsWith('.e2e.test.ts')).length
  }

  info.hasCI = existsSync(join(ROOT, '.github', 'workflows', 'ci.yml'))

  // 最近轮次
  const retroDir = join(ROOT, 'docs', 'retro')
  info.latestRound = 0
  if (existsSync(retroDir)) {
    const retroFiles = readdirSync(retroDir)
      .filter(f => f.startsWith('round-') && f.endsWith('.md'))
      .map(f => parseInt(f.match(/round-(\d+)/)?.[1] || '0', 10))
      .sort((a, b) => b - a)
    info.latestRound = retroFiles[0] || 0
  }

  // 文档列表
  const docsDir = join(ROOT, 'docs')
  info.docsList = existsSync(docsDir) ? walkDir(docsDir).filter(f => f.endsWith('.md')) : []

  return info
}

// ── 渲染 ──
function render(info) {
  const now = new Date().toISOString().split('T')[0]
  const lines = []

  lines.push('# PersonaChat 项目上下文快照')
  lines.push(`> 生成日期: ${now} | 最近轮次: Round ${info.latestRound}`)
  lines.push('')

  // ── 项目概览 ──
  lines.push('## 项目概览')
  lines.push('')
  lines.push('| 指标 | 数值 |')
  lines.push('|------|------|')
  lines.push(`| 规则 | ${info.ruleCount} 条 |`)
  for (const [cat, count] of Object.entries(info.ruleCategories)) {
    lines.push(`| - ${cat} | ${count} |`)
  }
  lines.push(`| 契约 Schema | ${info.contractCount} 个 |`)
  lines.push(`| API 路由 | ${info.routes.length} 条 |`)
  lines.push(`| API 源文件 | ${info.apiCount} 个 |`)
  lines.push(`| Spec 文档 | ${info.specCount} 个 |`)
  lines.push(`| E2E 测试 | ${info.e2eCount} 个 |`)
  lines.push(`| CI | ${info.hasCI ? '已配置' : '未配置'} |`)
  lines.push(`| 文档 | ${info.docsList.length} 个 |`)
  lines.push('')

  // ── 架构速查 ──
  lines.push('## 架构速查')
  lines.push('')
  lines.push('```')
  lines.push('apps/miniprogram  (微信小程序 — 只通过 HTTP API 通信)')
  lines.push('       │')
  lines.push('       ▼')
  lines.push('apps/api/src/router/     ← Hono 路由层 (Zod 输入校验)')
  lines.push('apps/api/src/service/    ← 业务逻辑层')
  lines.push('apps/api/src/repository/ ← 数据访问层 (D1)')
  lines.push('apps/api/src/domain/     ← 纯函数领域逻辑')
  lines.push('apps/api/src/middleware/  ← 横切关注点 (cors, error)')
  lines.push('')
  lines.push('packages/contracts/  ← Zod SSOT 契约层 (前后端共享)')
  lines.push('```')
  lines.push('')
  lines.push('**依赖方向**: domain ↚ repository/service/router（禁止反向）')
  lines.push('**契约层**: 只依赖 zod + typescript + vitest（ARCH-002）')
  lines.push('')

  // ── 规则速查表 ──
  lines.push('## 规则速查')
  lines.push('')
  lines.push('| 规则 | 标题 | 类别 | 严重度 | 可校验 |')
  lines.push('|------|------|------|--------|--------|')
  for (const r of info.rules.sort((a, b) => a.id.localeCompare(b.id))) {
    const icon = r.machineCheck ? '✅' : '👁'
    lines.push(`| ${r.id} | ${r.title} | ${r.category} | ${r.severity} | ${icon} |`)
  }
  lines.push('')

  // ── 路由表 ──
  lines.push('## 路由表')
  lines.push('')
  lines.push('| 方法 | 路径 | 文件 |')
  lines.push('|------|------|------|')

  // 去重 + 排序
  const seen = new Set()
  const sortedRoutes = info.routes
    .filter(r => { const k = `${r.method} ${r.path}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

  for (const r of sortedRoutes) {
    lines.push(`| ${r.method} | \`${r.path}\` | ${r.file} |`)
  }
  lines.push('')

  // ── 契约速查 ──
  lines.push('## 契约速查')
  lines.push('')
  for (const c of info.contracts) {
    if (c.file === 'index.ts') continue
    lines.push(`### ${c.file}`)
    if (c.schemas.length > 0) {
      lines.push(`- Schemas: ${c.schemas.join(', ')}`)
    }
    if (c.types.length > 0) {
      lines.push(`- Types: ${c.types.join(', ')}`)
    }
    lines.push('')
  }

  // ── 关键约定 ──
  lines.push('## 关键约定')
  lines.push('')
  lines.push('- **错误码映射**: `packages/contracts/src/schemas/common.ts` (SSOT)')
  lines.push('- **鉴权模式**: 当前无鉴权层 (SEC-001 advisory)，路由默认公开')
  lines.push('- **PII 边界**: 不存储用户原始输入到持久化层')
  lines.push('- **命名**: 文件 kebab-case，类 PascalCase，API 端点 /api/{resource}')
  lines.push('- **数据库**: D1 with prepare+bind，禁止字符串拼接')
  lines.push('')

  // ── 文档索引 ──
  lines.push('## 文档索引')
  lines.push('')
  for (const doc of info.docsList) {
    const relPath = relative(ROOT, doc).replace(/\\/g, '/')
    lines.push(`- [${relPath}](${relPath})`)
  }
  lines.push('')

  return lines.join('\n')
}

// ── 辅助 ──
function walkDir(dir) {
  const files = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) files.push(...walkDir(full))
      else files.push(full)
    }
  } catch (_) { /* skip */ }
  return files
}

// ── Main ──
const info = gather()
const md = render(info)
writeFileSync(OUTPUT, md, 'utf-8')
console.log(`✅ 上下文快照已写入 ${OUTPUT}`)
console.log(`   规则: ${info.ruleCount} | 路由: ${info.routes.length} | 最近轮次: Round ${info.latestRound}`)
