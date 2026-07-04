#!/usr/bin/env node
// ── 轮次增量上下文生成（升级版） ──
// 输出 docs/round-{N}-delta.md，< 3KB 的增量上下文
// 用法: node scripts/gen-round-delta.mjs [--round N] [--tag]
//   --round N  指定轮次编号（默认自动推断上一轮 +1）
//   --tag      自动打 git tag 供下一轮 from 用

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RETRO_DIR = join(ROOT, 'docs', 'retro')

// ── 参数解析 ──
const args = process.argv.slice(2)
let targetRound = null
let shouldTag = false

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--round' && args[i + 1]) { targetRound = parseInt(args[i + 1], 10); i++ }
  else if (args[i] === '--tag') shouldTag = true
}

// ── 获取最近轮次 ──
function getLatestRound() {
  if (!existsSync(RETRO_DIR)) return 0
  const files = readdirSync(RETRO_DIR)
    .filter(f => f.startsWith('round-') && f.endsWith('.md'))
    .map(f => parseInt(f.match(/round-(\d+)/)?.[1] || '0', 10))
    .sort((a, b) => b - a)
  return files[0] || 0
}

function getLastRetro(round) {
  const prevPath = join(RETRO_DIR, `round-${round - 1}.md`)
  if (existsSync(prevPath)) {
    const content = readFileSync(prevPath, 'utf-8')
    // 提取关键教训（20 字以内摘要）
    const lessons = [...content.matchAll(/- \*\*教训\*\*[：:]\s*(.+)/g)]
    return lessons.map(m => m[1].trim().slice(0, 80))
  }
  return []
}

function getRecentGitActivity() {
  try {
    const log = execSync('git log --oneline -5 --no-decorate', { cwd: ROOT, encoding: 'utf-8' }).trim()
    return log.split('\n')
  } catch {
    return ['(git 不可用)']
  }
}

// ── 生成增量上下文 ──
function generateDelta(round) {
  const now = new Date().toISOString().split('T')[0]
  const prevLessons = getLastRetro(round)
  const recentActivity = getRecentGitActivity()
  const lines = []

  // 头部 — 保持紧凑
  lines.push(`# R${round} 增量上下文`)
  lines.push(`> ${now} | from: round-${round - 1 || 'initial'}`)
  lines.push('')

  // ── A1: 本轮目标 ──（2-3 句）
  lines.push('## 本轮目标')
  lines.push('')
  lines.push('（待填写本轮要实现的功能或要解决的问题）')
  lines.push('')

  // ── A2: 约束 & 规则 ──（只列本轮相关的）
  lines.push('## 本轮约束')
  lines.push('')
  lines.push('| 规则 | 要求 |')
  lines.push('|------|------|')
  lines.push('| AI-001 | 先读 Spec 再写码 |')
  lines.push('| AI-002 | 测试先行 |')
  lines.push('| AI-004 | 每次改动跑 trinity |')
  lines.push('| AI-007 | E2E 覆盖 PRD 验收标准 |')
  lines.push('')
  lines.push('> 全量规则见 `pnpm check` 或 `.trae/rules/`')
  lines.push('')

  // ── A3: 上轮教训 ──（从 retro 提取，< 3 条）
  if (prevLessons.length > 0) {
    lines.push('## 上轮教训')
    lines.push('')
    for (const l of prevLessons.slice(0, 3)) {
      lines.push(`- ${l}`)
    }
    lines.push('')
  } else if (round === 1) {
    lines.push('## 上轮教训')
    lines.push('')
    lines.push('（首轮，无教训可参考）')
    lines.push('')
  }

  // ── A4: 变更文件清单 ──（模板占位）
  lines.push('## 变更文件')
  lines.push('')
  lines.push('| 文件 | 操作 | 说明 |')
  lines.push('|------|------|------|')
  lines.push('| - | - | - |')
  lines.push('')

  // ── A5: 最近提交 ──（供 AI 参考上下文）
  lines.push('## 最近提交')
  lines.push('')
  for (const commit of recentActivity.slice(0, 3)) {
    lines.push(`- ${commit}`)
  }
  lines.push('')

  // ── A6: 快速链接 ──
  lines.push('## 快速链接')
  lines.push('')
  lines.push(`- 全量上下文: [context-snapshot.md](../context-snapshot.md)`)
  if (round > 1) lines.push(`- 上轮复盘: [round-${round - 1}.md](round-${round - 1}.md)`)
  lines.push(`- 教训索引: [lessons-learned.md](lessons-learned.md)`)
  lines.push(`- 工作流: [spec-first-workflow.md](../workflow/spec-first-workflow.md)`)
  lines.push(`- AI 手册: [AGENTS.md](../../AGENTS.md)`)
  lines.push('')

  return lines.join('\n')
}

// ── Main ──
const latestRound = getLatestRound()
const round = targetRound || (latestRound + 1)
const delta = generateDelta(round)

const outputFile = targetRound
  ? join(ROOT, 'docs', `round-${round}-delta.md`)
  : join(ROOT, 'docs', `round-${round}-delta.md`)

writeFileSync(outputFile, delta, 'utf-8')

const sizeKB = (Buffer.byteLength(delta, 'utf-8') / 1024).toFixed(1)
const sizeIcon = sizeKB < 3 ? '✅' : '⚠'

console.log(`${sizeIcon} Round ${round} 增量上下文 → ${outputFile} (${sizeKB} KB)`)

// ── 自动打 tag ──
if (shouldTag) {
  try {
    execSync(`git tag "round-${round}-start"`, { cwd: ROOT, encoding: 'utf-8' })
    console.log(`🏷 git tag round-${round}-start 已创建`)
  } catch (e) {
    console.log(`⚠ git tag 失败: ${e.message?.slice(0, 80)}`)
  }
}
