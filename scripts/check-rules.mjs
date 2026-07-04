#!/usr/bin/env node
// ── 规则机器校验：检查项目是否符合 .trae/rules/ 中定义的可校验规则
// 升级版：14 项 enforcement，覆盖 ARCH/CODE/SEC/AI/META 五大类
// 适配技术栈：Hono + CF Workers + 微信小程序 + pnpm workspace

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RULES_DIR = join(ROOT, '.trae', 'rules')
const SCRIPT_FILE = join(__dirname, 'check-rules.mjs')

const CHECKS = []

// ═══════════════════════════════════════════════
// ARCH-002: 契约层纯净 — contracts 只能依赖 zod/typescript/vitest
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const pkgPath = join(ROOT, 'packages', 'contracts', 'package.json')
  if (!existsSync(pkgPath)) return { rule: 'ARCH-002', ok: false, msg: 'contracts/package.json not found' }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const forbidden = Object.keys(deps).filter(d => d !== 'zod' && d !== 'typescript' && d !== 'vitest')

  return {
    rule: 'ARCH-002',
    ok: forbidden.length === 0,
    msg: forbidden.length > 0
      ? `Contracts 层禁止依赖: ${forbidden.join(', ')}`
      : 'Contracts 层依赖纯净',
  }
})

// ═══════════════════════════════════════════════
// CODE-001: 禁止 any 类型
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'packages'),
    join(ROOT, 'apps', 'api', 'src'),
  ]

  let anyCount = 0
  const locations = []
  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => f.endsWith('.ts'))
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (trimmed.match(/: any[),; \n}]/) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          anyCount++
          locations.push(`  ${relative(ROOT, file)}:${i + 1}`)
        }
      }
    }
  }

  return {
    rule: 'CODE-001',
    ok: anyCount === 0,
    msg: anyCount > 0 ? `发现 ${anyCount} 处 any 类型:\n${locations.join('\n')}` : '无 any 类型',
  }
})

// ═══════════════════════════════════════════════
// ARCH-001: 依赖方向 domain→[repository|service|router] 禁止反向
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const apiSrc = join(ROOT, 'apps', 'api', 'src')
  if (!existsSync(apiSrc)) return { rule: 'ARCH-001', ok: true, msg: 'API src 不存在，跳过' }

  const violations = []

  const domainFiles = walkDir(join(apiSrc, 'domain')).filter(f => f.endsWith('.ts'))
  for (const f of domainFiles) {
    const content = readFileSync(f, 'utf-8')
    if (content.includes('../service') || content.includes('../repository') || content.includes('../router')) {
      violations.push(`${relative(ROOT, f)}: domain 层引用了其他层`)
    }
  }

  const repoFiles = walkDir(join(apiSrc, 'repository')).filter(f => f.endsWith('.ts'))
  for (const f of repoFiles) {
    const content = readFileSync(f, 'utf-8')
    if (content.includes('../service') || content.includes('../router')) {
      violations.push(`${relative(ROOT, f)}: repository 层引用了 service/router`)
    }
  }

  const svcFiles = walkDir(join(apiSrc, 'service')).filter(f => f.endsWith('.ts'))
  for (const f of svcFiles) {
    const content = readFileSync(f, 'utf-8')
    if (content.includes('../router')) {
      violations.push(`${relative(ROOT, f)}: service 层引用了 router`)
    }
  }

  return {
    rule: 'ARCH-001',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `依赖方向违规:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '依赖方向合规',
  }
})

// ═══════════════════════════════════════════════
// CODE-004: 文件行数 ≤ 300
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'apps', 'api', 'src'),
    join(ROOT, 'packages', 'contracts', 'src'),
  ]

  const longFiles = []
  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => f.endsWith('.ts'))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n').length
      if (lines > 300) {
        longFiles.push(`${relative(ROOT, file)}: ${lines} 行`)
      }
    }
  }

  return {
    rule: 'CODE-004',
    ok: longFiles.length === 0,
    msg: longFiles.length > 0
      ? `文件超过 300 行:\n${longFiles.map(f => `  ${f}`).join('\n')}`
      : '文件行数合规',
  }
})

// ═══════════════════════════════════════════════
// ARCH-003: 小程序前端禁止 import 后端模块
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const miniSrc = join(ROOT, 'apps', 'miniprogram')
  if (!existsSync(miniSrc)) return { rule: 'ARCH-003', ok: true, msg: '小程序源码目录不存在，跳过' }

  const violations = []
  const sourceFiles = walkDir(miniSrc).filter(f => /\.(js|ts)$/.test(f))

  for (const f of sourceFiles) {
    const content = readFileSync(f, 'utf-8')
    // 检测 import/require 引用 apps/api 或 packages（非 contracts）的路径
    const importPatterns = [
      /from\s+['"]\.\.\/api\//g,
      /from\s+['"]\.\.\/\.\.\/apps\/api\//g,
      /require\s*\(\s*['"]\.\.\/api\//g,
    ]
    for (const pattern of importPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        violations.push(`${relative(ROOT, f)}: 小程序引用了后端模块`)
        break
      }
    }
    // 检测 import 非 contracts 的 packages
    const pkgImport = content.match(/from\s+['"](\.\.\/)*@personachat\/(?!contracts)/g)
    if (pkgImport) {
      violations.push(`${relative(ROOT, f)}: 小程序引用了非 contracts 的 workspace 包`)
    }
  }

  return {
    rule: 'ARCH-003',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `前端越界引用:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '前端模块隔离合规',
  }
})

// ═══════════════════════════════════════════════
// CODE-002: 禁止空 catch / 仅 console.error 的 catch
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'apps'),
    join(ROOT, 'packages'),
  ]

  const violations = []
  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => /\.(ts|js)$/.test(f) && !f.includes('node_modules') && !f.includes('.wrangler'))
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      let inCatch = false
      let catchStart = 0
      let catchBodyLines = []
      let braceDepth = 0

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (trimmed.match(/\bcatch\b\s*[({]/)) {
          inCatch = true
          catchStart = i + 1
          catchBodyLines = []
          braceDepth = 0
          continue
        }
        if (inCatch) {
          catchBodyLines.push(trimmed)
          for (const ch of trimmed) {
            if (ch === '{') braceDepth++
            if (ch === '}') {
              braceDepth--
              if (braceDepth < 0) {
                // Check the catch body
                const body = catchBodyLines.join('').replace(/\s/g, '')
                const isEmpty = body === '' || body === '}' || body === '})'
                const isOnlyConsole = (
                  body.startsWith('console.error(') || body.startsWith('console.log(')
                ) && !body.includes('throw') && !body.includes('return')
                if (isEmpty) {
                  violations.push(`${relative(ROOT, file)}:${catchStart} 空 catch 块`)
                } else if (isOnlyConsole) {
                  violations.push(`${relative(ROOT, file)}:${catchStart} catch 仅含 console.error/log`)
                }
                inCatch = false
                break
              }
            }
          }
        }
      }
    }
  }

  return {
    rule: 'CODE-002',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `异常处理违规:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '异常处理合规',
  }
})

// ═══════════════════════════════════════════════
// CODE-002b: 禁止 eval / new Function
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'apps'),
    join(ROOT, 'packages'),
  ]

  const violations = []
  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => /\.(ts|js|mjs)$/.test(f) && !f.includes('node_modules') && !f.includes('.wrangler'))
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      // 使用更精确的检测：匹配作为函数调用的 eval( 和作为构造的 new Function(
      // 排除正则表达式字面量和注释中出现的
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('//') || line.startsWith('*')) continue
        if (/\beval\s*\(/.test(line) && !line.includes('RegExp(') && !line.includes('regex')) {
          violations.push(`${relative(ROOT, file)}:${i + 1} 使用了 eval()`)
        }
        if (/\bnew\s+Function\s*\(/.test(line)) {
          violations.push(`${relative(ROOT, file)}:${i + 1} 使用了 new Function()`)
        }
      }
    }
  }

  return {
    rule: 'CODE-002b',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `危险代码:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '无 eval/new Function',
  }
})

// ═══════════════════════════════════════════════
// CODE-003: 命名约定 — 文件 kebab-case 与导出匹配 [advisory]
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'apps', 'api', 'src'),
    join(ROOT, 'packages', 'contracts', 'src'),
  ]

  const violations = []
  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => f.endsWith('.ts'))
    for (const file of files) {
      const rawName = file.split(/[/\\]/).pop()
      const fileName = rawName.replace('.ts', '')
      // 跳过 index, server, 和带点号的命名（如 chat.router.ts, persona.router.ts）
      if (fileName === 'index' || fileName === 'server' || fileName.includes('.')) continue
      const content = readFileSync(file, 'utf-8')

      // 检查文件名是否为 kebab-case（纯单字母文件名也允许，如 llm.ts）
      const baseName = fileName.split('.')[0]
      if (baseName.includes('_') || /[A-Z]/.test(baseName)) {
        violations.push(`${relative(ROOT, file)}: 文件名应使用 kebab-case`)
        continue
      }

      // 文件名与导出符号的对应关系（宽松校验）
      // persona-repo → PersonaRepository (repo→Repository 映射)
      // chat-svc → ChatService (svc→Service 映射)
      const exportClassMatch = content.match(/export\s+(?:class|function|const)\s+(\w+)/)
      if (exportClassMatch && fileName !== 'index') {
        const exportedName = exportClassMatch[1]
        const nameParts = fileName.split('-')
        const allPartsInName = nameParts.every(part => {
          // svc → Service, repo → Repository 等常见缩写映射
          const expanded = part === 'svc' ? 'service'
            : part === 'repo' ? 'repository'
            : part
          return exportedName.toLowerCase().includes(expanded.toLowerCase())
        })
        if (!allPartsInName) {
          violations.push(`${relative(ROOT, file)}: 文件名 "${fileName}" 的主要词汇未出现在导出 "${exportedName}" 中`)
        }
      }
    }
  }

  return {
    rule: 'CODE-003',
    ok: true, // advisory 不阻断
    msg: violations.length > 0
      ? `[advisory] 命名约定建议:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '命名约定合规',
  }
})

// ═══════════════════════════════════════════════
// SEC-001: Hono 路由 auth 声明 [advisory]
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const serverFile = join(ROOT, 'apps', 'api', 'src', 'server.ts')
  if (!existsSync(serverFile)) return { rule: 'SEC-001', ok: true, msg: 'server.ts 不存在，跳过' }

  const serverContent = readFileSync(serverFile, 'utf-8')
  const hasAuthMiddleware = /authMiddleware/.test(serverContent)

  const routerDir = join(ROOT, 'apps', 'api', 'src', 'router')
  if (!existsSync(routerDir)) return { rule: 'SEC-001', ok: true, msg: 'Router 目录不存在，跳过' }

  const routesWithoutAuth = []
  const routeFiles = walkDir(routerDir).filter(f => f.endsWith('.ts'))

  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    const routeLines = content.split('\n').filter(l =>
      l.match(/router\.(get|post|put|delete|patch)\s*\(/)
    )
    for (const line of routeLines) {
      const pathMatch = line.match(/router\.\w+\s*\(\s*['"]([^'"]+)['"]/)
      if (pathMatch && pathMatch[1] !== '/api/health') {
        routesWithoutAuth.push(`${relative(ROOT, file)}: ${pathMatch[1]}`)
      }
    }
  }

  // [advisory] — 若 authMiddleware 已在 server.ts 全局应用，则视为覆盖
  if (hasAuthMiddleware && routesWithoutAuth.length > 0) {
    return {
      rule: 'SEC-001',
      ok: true,
      msg: `[advisory] authMiddleware 已全局应用，覆盖 ${routesWithoutAuth.length} 条路由（开发模式: 未配置 API_KEY 时允许所有请求）`,
    }
  }

  return {
    rule: 'SEC-001',
    ok: true,
    msg: routesWithoutAuth.length > 0
      ? `[advisory] ${routesWithoutAuth.length} 条路由未声明 auth（当前项目无鉴权层）:\n${routesWithoutAuth.slice(0, 5).map(r => `  ${r}`).join('\n')}${routesWithoutAuth.length > 5 ? `\n  ... 及另外 ${routesWithoutAuth.length - 5} 条` : ''}`
      : '路由 auth 声明合规',
  }
})

// ═══════════════════════════════════════════════
// SEC-002: 禁止硬编码凭据
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const srcDirs = [
    join(ROOT, 'apps'),
    join(ROOT, 'packages'),
  ]

  const violations = []
  const credentialPatterns = [
    /['"]api[_-]?key['"]\s*[:=]\s*['"][A-Za-z0-9_-]{8,}['"]/gi,
    /['"]secret['"]\s*[:=]\s*['"][A-Za-z0-9_-]{8,}['"]/gi,
    /['"]password['"]\s*[:=]\s*['"][^'"]+['"]/gi,
    /['"]token['"]\s*[:=]\s*['"][A-Za-z0-9._-]{16,}['"]/gi,
    /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
    /sk-[A-Za-z0-9]{20,}/g,   // OpenAI API key pattern
    /glm-[A-Za-z0-9]{10,}/g,  // GLM API key pattern
  ]

  for (const dir of srcDirs) {
    if (!existsSync(dir)) continue
    const files = walkDir(dir).filter(f => /\.(ts|js|json|yaml|yml|toml)$/.test(f) && !f.includes('node_modules') && !f.includes('.wrangler') && !f.includes('pnpm-lock'))
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      for (const pattern of credentialPatterns) {
        if (pattern.test(content)) {
          violations.push(`${relative(ROOT, file)}: 疑似硬编码凭据`)
          pattern.lastIndex = 0
          break
        }
      }
    }
  }

  return {
    rule: 'SEC-002',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `疑似硬编码凭据:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '无硬编码凭据',
  }
})

// ═══════════════════════════════════════════════
// SEC-003: 路由输入校验 — 检查是否使用 Zod schema
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const routerDir = join(ROOT, 'apps', 'api', 'src', 'router')
  if (!existsSync(routerDir)) return { rule: 'SEC-003', ok: true, msg: 'Router 目录不存在，跳过' }

  const violations = []
  const routeFiles = walkDir(routerDir).filter(f => f.endsWith('.ts'))

  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    // 检查每个路由 handler 中 c.req.json() 和 c.req.query() 是否有后续的 .parse()
    const handlers = content.match(/router\.\w+\s*\([^)]+\)[\s\S]*?\}\)\s*\)/g) || []
    for (const handler of handlers) {
      const hasRawJson = /c\.req\.json\s*\(\s*\)/.test(handler)
      const hasRawQuery = /c\.req\.query\s*\(\s*\)/.test(handler)
      const hasParse = /\.parse\s*\(/.test(handler) || /\.safeParse\s*\(/.test(handler)

      if ((hasRawJson || hasRawQuery) && !hasParse) {
        violations.push(`${relative(ROOT, file)}: 路由未对输入做 Zod 校验`)
        break
      }
    }
  }

  return {
    rule: 'SEC-003',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `输入校验缺失:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '路由输入校验合规',
  }
})

// ═══════════════════════════════════════════════
// AI-005: 禁止硬编码跨域可变集合 [advisory]
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  const apiSrc = join(ROOT, 'apps', 'api', 'src')
  if (!existsSync(apiSrc)) return { rule: 'AI-005', ok: true, msg: 'API src 不存在，跳过' }

  // 从 contracts 读取已定义的可变集合
  const contractsDir = join(ROOT, 'packages', 'contracts', 'src')
  const knownEnums = new Set()
  if (existsSync(contractsDir)) {
    const contractFiles = walkDir(contractsDir).filter(f => f.endsWith('.ts'))
    for (const f of contractFiles) {
      const content = readFileSync(f, 'utf-8')
      // 提取 as const 数组的成员值
      const constArrays = content.matchAll(/\bexport\s+const\s+\w+\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g)
      for (const match of constArrays) {
        const strMatch = match[1].matchAll(/['"]([^'"]+)['"]/g)
        for (const s of strMatch) {
          knownEnums.add(s[1])
        }
      }
    }
  }

  const warnings = []
  const sourceFiles = walkDir(apiSrc).filter(f => f.endsWith('.ts'))
  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8')
    // 检测 Record 字面量中硬编码的 key，其值与 contracts 中定义的集合重叠
    const recordMatches = content.matchAll(/const\s+\w+\s*:\s*Record\s*<\s*string[\s\S]*?\{([\s\S]*?)\}\s*;/g)
    for (const match of recordMatches) {
      const strValues = match[1].matchAll(/['"]([^'"]+)['"]\s*:/g)
      const localKeys = new Set()
      for (const sv of strValues) {
        localKeys.add(sv[1])
      }
      // 如果本地 key 与 contracts 中定义的集合重叠 >= 2 个，视为可能硬编码
      const overlap = [...localKeys].filter(k => knownEnums.has(k))
      if (overlap.length >= 2) {
        warnings.push(`${relative(ROOT, file)}: 疑似硬编码集合 [${overlap.join(', ')}]，建议从 contracts SSOT 派生`)
      }
    }
  }

  return {
    rule: 'AI-005',
    ok: true, // advisory 不阻断
    msg: warnings.length > 0
      ? `[advisory] SSOT 派生建议:\n${warnings.map(w => `  ${w}`).join('\n')}`
      : 'SSOT 派生合规',
  }
})

// ═══════════════════════════════════════════════
// META-001: 无校验不立规
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  if (!existsSync(RULES_DIR)) return { rule: 'META-001', ok: true, msg: 'Rules 目录不存在，跳过' }

  const violations = []
  const machineKeywords = [
    'check-rules.mjs', 'tsc', 'vitest', 'check-spec-binding',
    'ci.yml', 'eslint', 'grep', 'regex', '结构检查', '静态分析',
    'ci', '三件套', 'wc', 'vi test', 'typecheck',
  ]
  const advisoryMarker = '[advisory]'

  const ruleFiles = walkDir(RULES_DIR)
    .filter(f => f.endsWith('.md') && !relative(RULES_DIR, f).startsWith('meta'))

  for (const file of ruleFiles) {
    const content = readFileSync(file, 'utf-8')
    // 提取"校验方式"段
    const validationSection = content.match(/##\s*校验方式[\s\S]*?(?=##\s|\n---|$)/)
    if (!validationSection) {
      violations.push(`${relative(ROOT, file)}: 缺少"校验方式"段`)
      continue
    }

    const sectionText = validationSection[0].toLowerCase()
    const hasMachineCheck = machineKeywords.some(kw => sectionText.includes(kw.toLowerCase()))
    const hasAdvisory = sectionText.includes(advisoryMarker.toLowerCase())

    if (!hasMachineCheck && !hasAdvisory) {
      violations.push(`${relative(ROOT, file)}: 校验方式段无可机器校验关键词，也未标注 [advisory]`)
    }
  }

  return {
    rule: 'META-001',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `规则可校验性不足:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '所有规则可校验或已标注 [advisory]',
  }
})

// ═══════════════════════════════════════════════
// META-003: 声明即实现 — 规则声称 check-rules.mjs → 脚本必须有分支
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  if (!existsSync(RULES_DIR)) return { rule: 'META-003', ok: true, msg: 'Rules 目录不存在，跳过' }

  // 从规则文档提取声称使用 check-rules.mjs 的规则 ID
  const claimedIds = new Set()
  const ruleFiles = walkDir(RULES_DIR).filter(f => f.endsWith('.md'))

  for (const file of ruleFiles) {
    const content = readFileSync(file, 'utf-8')
    // 提取 rule_id
    const idMatch = content.match(/rule_id:\s*([A-Z]+-\d+)/)
    if (!idMatch) continue
    const ruleId = idMatch[1]

    // 检查校验方式段是否声称用 check-rules.mjs（排除"不直接校验"等表述）
    const validationSection = content.match(/##\s*校验方式[\s\S]*?(?=##\s|\n---|$)/)
    if (validationSection && /check-rules\.mjs/i.test(validationSection[0])) {
      // 排除 "不直接校验" / "无直接脚本校验" 等模式
      if (!/不直接校验|无直接脚本校验|不对.*校验/.test(validationSection[0])) {
        claimedIds.add(ruleId)
      }
    }
  }

  // 从 check-rules.mjs 提取所有 enforcement 分支
  const scriptContent = readFileSync(SCRIPT_FILE, 'utf-8')
  const branchMatches = scriptContent.matchAll(/\/\/\s*═+\s*\n\/\/\s*([A-Z]+-\d+(?:b)?)\s*:/g)
  const enforcedIds = new Set()
  for (const match of branchMatches) {
    enforcedIds.add(match[1])
  }

  const violations = []
  for (const id of claimedIds) {
    if (!enforcedIds.has(id)) {
      violations.push(`META-003: 规则 ${id} 声称 check-rules.mjs 校验，但脚本中无对应 enforcement 分支`)
    }
  }

  return {
    rule: 'META-003',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `声明-实现不匹配:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '声明即实现匹配',
  }
})

// ═══════════════════════════════════════════════
// META-004: 实现即声明 — 脚本有分支 → 必须有对应规则文档
// ═══════════════════════════════════════════════
CHECKS.push(async () => {
  if (!existsSync(RULES_DIR)) return { rule: 'META-004', ok: true, msg: 'Rules 目录不存在，跳过' }

  // 从 check-rules.mjs 提取所有 enforcement 分支
  const scriptContent = readFileSync(SCRIPT_FILE, 'utf-8')
  const branchMatches = scriptContent.matchAll(/\/\/\s*═+\s*\n\/\/\s*([A-Z]+-\d+(?:b)?)\s*:/g)
  const enforcedIds = new Set()
  for (const match of branchMatches) {
    enforcedIds.add(match[1])
  }

  // 从规则文档提取所有 rule_id
  const ruleIds = new Set()
  const ruleFiles = walkDir(RULES_DIR).filter(f => f.endsWith('.md'))

  for (const file of ruleFiles) {
    const content = readFileSync(file, 'utf-8')
    const idMatch = content.match(/rule_id:\s*([A-Z]+-\d+)/)
    if (idMatch) ruleIds.add(idMatch[1])
  }

  const violations = []
  for (const id of enforcedIds) {
    if (!ruleIds.has(id) && !id.endsWith('b')) { // skip variant suffixes like CODE-002b
      violations.push(`META-004: enforcement 分支 ${id} 无对应规则文档`)
    }
  }

  return {
    rule: 'META-004',
    ok: violations.length === 0,
    msg: violations.length > 0
      ? `幽灵 enforcement:\n${violations.map(v => `  ${v}`).join('\n')}`
      : '实现即声明匹配',
  }
})

// ── 辅助函数 ──
function walkDir(dir) {
  const files = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) files.push(...walkDir(full))
      else files.push(full)
    }
  } catch (_) { /* skip unreadable dirs */ }
  return files
}

// ── 运行所有检查 ──
async function main() {
  console.log('PersonaChat 规则机器校验')
  console.log(`规则来源: ${RULES_DIR}`)
  console.log(`enforcement 项数: ${CHECKS.length}`)
  console.log('')

  let allPassed = true
  let advisoryCount = 0
  for (const check of CHECKS) {
    const result = await check()
    const isAdvisory = result.msg.includes('[advisory]')
    const icon = result.ok ? (isAdvisory ? '⚡' : '✓') : '✗'
    console.log(`  ${icon} [${result.rule}] ${result.msg}`)
    if (!result.ok) allPassed = false
    if (isAdvisory) advisoryCount++
  }

  console.log('')
  if (allPassed) {
    console.log(`全部阻断检查通过${advisoryCount > 0 ? ` (${advisoryCount} 条 advisory)` : ''}`)
    process.exit(0)
  } else {
    console.log('存在未通过的阻断检查')
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
