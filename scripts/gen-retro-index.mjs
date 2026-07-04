#!/usr/bin/env node
// ── 复盘索引生成（升级版） ──
// 聚合所有复盘文档的教训，生成 lessons-learned.md
// 新增：量化对比表 + 按类别分组 + 反推状态跟踪

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RETRO_DIR = join(ROOT, 'docs', 'retro')
const OUTPUT = join(RETRO_DIR, 'lessons-learned.md')

// ── 提取单轮复盘数据 ──
function parseRound(file) {
  const round = parseInt(file.match(/round-(\d+)/)?.[1] || '0', 10)
  const content = readFileSync(join(RETRO_DIR, file), 'utf-8')

  // 提取量化指标
  const verdictMatch = content.match(/(?:结论|verdict)[：:]\s*(.+)/i)
  const acMatch = content.match(/(?:AC\s*完成率|验收标准)[：:]\s*(\d+\/\d+)/)
  const blockerMatch = content.match(/(?:blocker|阻断)[：:]\s*(\d+)/i)
  const testMatch = content.match(/(?:测试|test)[：:]\s*(\d+\/\d+)/i)

  // 提取教训
  const lessons = extractLessons(content, round)

  // 提取反推状态
  const pushbacks = []
  const pbMatches = [...content.matchAll(/(?:反推|pushback)[：:]\s*(.+)/gi)]
  for (const m of pbMatches) {
    pushbacks.push(m[1].trim())
  }

  return {
    round,
    lessons,
    verdict: verdictMatch?.[1]?.trim() || '?',
    acCompletion: acMatch?.[1] || '?',
    blockerCount: blockerMatch ? parseInt(blockerMatch[1]) : 0,
    testCoverage: testMatch?.[1] || '?',
    pushbacks,
  }
}

// ── 提取教训 ──
function extractLessons(content, round) {
  const lessons = []
  const lines = content.split('\n')
  let inLessons = false
  let currentLesson = ''
  let category = '未分类'

  for (const line of lines) {
    if (line.match(/^##\s+(教训|经验|lessons?)/i)) {
      inLessons = true
      continue
    }
    if (line.startsWith('## ') && !line.match(/^##\s+(教训|经验|lessons?)/i)) {
      if (inLessons) break
    }
    if (inLessons && line.trim().startsWith('-')) {
      if (currentLesson) {
        lessons.push({ round, text: currentLesson, category })
      }
      currentLesson = line.trim().slice(1).trim()
      // 尝试识别类别
      if (/规则|rule|校验|check/i.test(currentLesson)) category = '规则'
      else if (/spec|需求|PRD|验收/i.test(currentLesson)) category = 'Spec'
      else if (/测试|test|vitest/i.test(currentLesson)) category = '测试'
      else if (/实现|代码|code|import/i.test(currentLesson)) category = '实现'
      else if (/工作流|流程|角色|orchestrat/i.test(currentLesson)) category = '工作流'
      else category = '其他'
    } else if (inLessons && currentLesson && line.trim()) {
      currentLesson += ` ${line.trim()}`
    }
  }
  if (currentLesson) {
    lessons.push({ round, text: currentLesson, category })
  }
  return lessons
}

// ── 构建索引 ──
function buildIndex() {
  if (!existsSync(RETRO_DIR)) return { rounds: [], allLessons: [] }

  const files = readdirSync(RETRO_DIR)
    .filter(f => f.startsWith('round-') && f.endsWith('.md'))
    .sort((a, b) => {
      const na = parseInt(a.match(/round-(\d+)/)?.[1] || '0', 10)
      const nb = parseInt(b.match(/round-(\d+)/)?.[1] || '0', 10)
      return na - nb
    })

  const rounds = []
  for (const file of files) {
    rounds.push(parseRound(file))
  }

  const allLessons = []
  for (const r of rounds) {
    allLessons.push(...r.lessons)
  }

  return { rounds, allLessons }
}

// ── 渲染 ──
function render({ rounds, allLessons }) {
  const now = new Date().toISOString().split('T')[0]
  const lines = []

  lines.push('# Lessons Learned — 教训索引')
  lines.push(`> 生成日期: ${now} | 总教训: ${allLessons.length} | 覆盖轮次: ${rounds.length}`)
  lines.push('')

  // ── 量化对比表 ──
  if (rounds.length > 0) {
    lines.push('## 轮次对比')
    lines.push('')
    lines.push('| 轮次 | AC 完成率 | 测试覆盖 | Blocker | 结论 |')
    lines.push('|------|-----------|----------|---------|------|')

    for (const r of rounds) {
      const blockerIcon = r.blockerCount > 0 ? `✗ ${r.blockerCount}` : '✓ 0'
      lines.push(`| Round ${r.round} | ${r.acCompletion} | ${r.testCoverage} | ${blockerIcon} | ${r.verdict} |`)
    }
    lines.push('')

    // ── 反推状态 ──
    const pushbackRounds = rounds.filter(r => r.pushbacks.length > 0)
    if (pushbackRounds.length > 0) {
      lines.push('## 反推记录')
      lines.push('')
      for (const r of pushbackRounds) {
        for (const pb of r.pushbacks) {
          lines.push(`- **Round ${r.round}**: ${pb}`)
        }
      }
      lines.push('')
    }
  }

  // ── 按类别分组 ──
  const byCategory = {}
  for (const l of allLessons) {
    if (!byCategory[l.category]) byCategory[l.category] = []
    byCategory[l.category].push(l)
  }

  const catOrder = ['Spec', '测试', '规则', '实现', '工作流', '其他']
  for (const cat of catOrder) {
    const catLessons = byCategory[cat]
    if (!catLessons || catLessons.length === 0) continue

    lines.push(`## ${cat}`)
    lines.push('')
    for (const l of catLessons) {
      lines.push(`- (Round ${l.round}) ${l.text}`)
    }
    lines.push('')
  }

  // ── 教训演进趋势 ──
  if (rounds.length >= 2) {
    lines.push('## 趋势')
    lines.push('')

    const firstHalf = rounds.slice(0, Math.ceil(rounds.length / 2))
    const secondHalf = rounds.slice(Math.ceil(rounds.length / 2))
    const firstBlocker = firstHalf.reduce((s, r) => s + r.blockerCount, 0)
    const secondBlocker = secondHalf.reduce((s, r) => s + r.blockerCount, 0)

    lines.push(`| 指标 | 前半程 | 后半程 |`)
    lines.push(`|------|--------|--------|`)
    lines.push(`| 轮次数 | ${firstHalf.length} | ${secondHalf.length} |`)
    lines.push(`| 累计 Blocker | ${firstBlocker} | ${secondBlocker} |`)
    lines.push(`| 平均教训/轮 | ${(firstHalf.reduce((s, r) => s + r.lessons.length, 0) / firstHalf.length).toFixed(1)} | ${(secondHalf.reduce((s, r) => s + r.lessons.length, 0) / secondHalf.length).toFixed(1)} |`)
    lines.push('')
  }

  if (allLessons.length === 0) {
    lines.push('（暂无教训记录，完成首轮复盘后自动生成）')
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('*自动生成，不要手动编辑。复盘后运行 `pnpm retro` 更新。*')

  return lines.join('\n')
}

// ── Main ──
const data = buildIndex()
const md = render(data)
writeFileSync(OUTPUT, md, 'utf-8')
console.log(`✅ 复盘索引 → ${OUTPUT}`)
console.log(`   轮次: ${data.rounds.length} | 教训: ${data.allLessons.length} | 类别: ${new Set(data.allLessons.map(l => l.category)).size}`)
