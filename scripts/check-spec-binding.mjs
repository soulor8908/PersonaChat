#!/usr/bin/env node
// ── Spec-Binding 校验：Spec Dx ↔ 代码 TECH-XXX 双向绑定 ──
// 漂移 (error, 阻断): Spec 有 Dx 但代码引用了不存在的 Dx
// 缺口 (warning, 不阻断): Spec 有 Dx 但代码未引用该 Dx

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SPEC_DIR = join(ROOT, 'docs', 'spec')

// ── 1. 从 Spec 文档中提取 Dx 决策编号 ──
function extractDecisionsFromSpecs() {
  const decisions = new Map() // Dx → { file, title, context }

  if (!existsSync(SPEC_DIR)) {
    return decisions
  }

  const specFiles = readdirSync(SPEC_DIR, { recursive: true })
    .filter(f => f.endsWith('.md') || f.endsWith('.tech.md'))

  for (const relFile of specFiles) {
    const fullPath = join(SPEC_DIR, relFile)
    const content = readFileSync(fullPath, 'utf-8')

    // 匹配 Dx 格式 — 审计修复 (2026-07-06):
    // 原正则要求 Dxx 后紧跟 [\s:：\-–]+，但 markdown bold 格式 **D40** 后是 ** 不匹配，
    // 且原 (?:^|\n) 锚点要求 Dxx 在行首，表格行 | **D40** | 中 Dxx 前有 | ** 不匹配。
    // 所有 Tech-Spec 的 Dx 统一为 **Dxx** bold 格式（共 44 个），改为精确匹配此格式。
    // 不匹配 D-1/D-2/D-3 偏离编号（backrefactor spec 使用，非标准 Dx）。
    const dMatches = content.matchAll(/\*\*D(\d+)\*\*[\s:：\-–]*([^\n]+)/g)

    for (const match of dMatches) {
      const dNum = parseInt(match[1], 10)
      const title = match[2]?.trim().slice(0, 80) || '(无标题)'
      const key = `D${dNum}`
      if (!decisions.has(key)) {
        decisions.set(key, { file: relFile, title })
      }
    }
  }

  return decisions
}

// ── 2. 从代码中提取 TECH-XXX 引用 ──
function extractTechRefsFromCode() {
  const refs = new Map() // TECH-XXX-001 → { file, line, dRef }
  // 审计扩展 (2026-07-06): 原仅校验 apps/api/src + packages/contracts/src，
  // 现扩展到 apps/web/src (TECH-WEB-*) + apps/miniprogram/src (TECH-API-* 引用后端 Dx)
  // 文件类型: .ts (api/contracts) + .tsx (web) + .js (miniprogram)
  // 不含 .wxml/.wxss/.json (注释格式不同，且非逻辑代码)
  const srcDirs = [
    join(ROOT, 'apps', 'api', 'src'),
    join(ROOT, 'packages', 'contracts', 'src'),
    join(ROOT, 'apps', 'web', 'src'),
    join(ROOT, 'apps', 'miniprogram', 'src'),
  ]

  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        // 匹配格式:
        // // TECH-API-001 D1
        // // TECH-CONTRACT-002 D1,D3
        // /* TECH-API-001 D1 */
        const match = lines[i].match(/TECH-(\w+)-(\d+)\s+(D\d[\d,]*)(?::|：|\s|$)/)
        if (match) {
          const module = match[1]
          const seq = match[2]
          const dRefs = match[3].trim().split(/\s*,\s*/).filter(r => r.startsWith('D'))
          // 过滤掉注释标记
          const cleanRefs = dRefs.map(r => r.replace(/[,;].*$/, '').trim())

          const key = `TECH-${module}-${seq}`
          // 累积同一 key 的多个 D 引用（不同文件/行可能有不同的 D 编号）
          if (refs.has(key)) {
            const existing = refs.get(key)
            for (const ref of cleanRefs) {
              if (!existing.dRefs.includes(ref)) {
                existing.dRefs.push(ref)
              }
            }
          } else {
            refs.set(key, { file: relative(ROOT, file), line: i + 1, dRefs: cleanRefs })
          }
        }
      }
    }
  }

  return refs
}

// ── 3. 交叉比对 ──
function crossCheck(decisions, refs) {
  const errors = []   // 阻断
  const warnings = [] // 非阻断

  const definedDx = new Set(decisions.keys())

  if (definedDx.size === 0) {
    warnings.push('Spec 目录下未找到任何 Dx 决策编号。如项目尚无 Tech-Spec，可忽略。')
    return { errors, warnings }
  }

  // ── 漂移检测 (error): 代码引用不存在的 Dx ──
  for (const [techKey, ref] of refs) {
    for (const dRef of ref.dRefs) {
      if (!definedDx.has(dRef)) {
        errors.push(
          `${ref.file}:${ref.line} — ${techKey} 引用了不存在的决策 ${dRef}（Spec 中无此编号）`
        )
      }
    }
  }

  // ── 缺口检测 (warning): Spec 有 Dx 但代码未引用 ──
  const allReferencedDx = new Set()
  for (const ref of refs.values()) {
    for (const dRef of ref.dRefs) {
      allReferencedDx.add(dRef)
    }
  }

  for (const [dKey, dInfo] of decisions) {
    if (!allReferencedDx.has(dKey) && refs.size > 0) {
      warnings.push(
        `${dInfo.file} — ${dKey}: "${dInfo.title}" 在代码中无 TECH-XXX 引用（可能是缺口或尚未实现）`
      )
    }
  }

  // ── META: 统计 ──
  const statLine = `Spec 决策: ${decisions.size} 个 | 代码引用: ${refs.size} 处 | 引用决策: ${allReferencedDx.size} 个`
  warnings.push(`[统计] ${statLine}`)

  return { errors, warnings }
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
function main() {
  console.log('PersonaChat Spec-Binding 校验')
  console.log(`Spec 目录: ${SPEC_DIR}`)
  console.log('')

  const decisions = extractDecisionsFromSpecs()
  const refs = extractTechRefsFromCode()

  console.log(`提取到 ${decisions.size} 个 Spec 决策编号`)
  console.log(`提取到 ${refs.size} 处代码 TECH-XXX 引用`)
  console.log('')

  const { errors, warnings } = crossCheck(decisions, refs)

  if (warnings.length > 0) {
    console.log('--- Warnings ---')
    for (const w of warnings) {
      console.log(`  ⚡ ${w}`)
    }
    console.log('')
  }

  if (errors.length > 0) {
    console.log('--- Errors ---')
    for (const e of errors) {
      console.log(`  ✗ ${e}`)
    }
    console.log('')
    console.log(`Spec-Binding 校验失败: ${errors.length} 个漂移错误`)
    process.exit(1)
  }

  console.log('Spec-Binding 校验通过')
  process.exit(0)
}

main()
