#!/usr/bin/env node
// ── 一键部署脚本 ──
// 用法: node scripts/deploy.mjs

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_DIR = join(__dirname, '..', 'apps', 'api')
const WRANGLER_TOML = join(API_DIR, 'wrangler.toml')

function run(cmd, cwd = API_DIR) {
  console.log(`\n> ${cmd}`)
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    })
    if (output.trim()) console.log(output.trim())
    return output.trim()
  } catch (err) {
    if (err.stderr?.trim()) console.error(err.stderr.trim())
    if (err.stdout?.trim()) console.log(err.stdout.trim())
    return null
  }
}

function prompt(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans.trim()) }))
}

function extractDbId(output) {
  // Try JSON format first (wrangler --json or new versions)
  try {
    const parsed = JSON.parse(output)
    if (parsed?.uuid) return parsed.uuid
  } catch {}
  // Try TOML-style: database_id = "xxx"
  const tomlMatch = output?.match(/database_id\s*=\s*"([^"]+)"/)
  if (tomlMatch) return tomlMatch[1]
  // Try UUID pattern in the output
  const uuidMatch = output?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuidMatch) return uuidMatch[0]
  return ''
}

async function main() {
  console.log('🚀 PersonaChat 一键部署\n')

  // Step 0: 检查登录
  console.log('📋 步骤 0: 检查 wrangler 登录状态')
  const whoami = run('npx wrangler whoami')
  if (!whoami || whoami.includes('not authenticated')) {
    console.log('\n❌ 未登录。请先运行: npx wrangler login')
    console.log('   然后重新执行 pnpm release\n')
    process.exit(1)
  }
  console.log('   ✅ 已登录')

  // Step 1: 创建 D1 数据库（如已存在则忽略错误）
  console.log('📋 步骤 1: 创建 D1 数据库')
  const createRaw = run('npx wrangler d1 create persona-chat-db 2>&1')
  let dbId = extractDbId(createRaw)

  if (!dbId) {
    // 可能已存在，用 info 命令获取 ID
    console.log('   ↻ 数据库可能已存在，尝试获取信息...')
    const infoRaw = run('npx wrangler d1 info persona-chat-db 2>&1')
    dbId = extractDbId(infoRaw)
  }

  if (!dbId) {
    console.log('\n⚠️  未能自动获取数据库 ID')
    console.log('   请手动运行:')
    console.log('   npx wrangler d1 create persona-chat-db')
    console.log('   然后把输出的 database_id 填入 apps/api/wrangler.toml\n')
    const manualId = await prompt('   手动输入 database_id（或回车跳过）: ')
    dbId = manualId || ''
  }

  if (!dbId) {
    console.log('\n❌ 无 database_id，终止部署。填好后重新运行 pnpm release\n')
    process.exit(1)
  }

  console.log(`   ✅ 数据库 ID: ${dbId}`)

  // Step 2: 更新 wrangler.toml
  console.log('📋 步骤 2: 更新 wrangler.toml')
  let toml = readFileSync(WRANGLER_TOML, 'utf-8')
  toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`)
  writeFileSync(WRANGLER_TOML, toml)
  console.log('   ✅ database_id 已更新')

  // Step 3: 初始化数据库表
  console.log('📋 步骤 3: 初始化数据库表')
  run('npx wrangler d1 execute persona-chat-db --file=./schema.sql 2>&1')
  console.log('   ✅ 表已创建')

  // Step 4: 设置 API Key
  console.log('📋 步骤 4: 设置 API Key（可选，不设则聊天接口无法使用）')
  const setKeys = await prompt('   是否现在设置 API Key？(y/n): ')
  if (setKeys.toLowerCase() === 'y') {
    run('npx wrangler secret put DEEPSEEK_API_KEY')
    run('npx wrangler secret put GLM_API_KEY')
  } else {
    console.log('   后续可手动运行:')
    console.log('   cd apps/api')
    console.log('   npx wrangler secret put DEEPSEEK_API_KEY')
    console.log('   npx wrangler secret put GLM_API_KEY')
  }

  // Step 5: 部署 Worker
  console.log('📋 步骤 5: 部署 Worker')
  const deployOutput = run('npx wrangler deploy src/server.ts 2>&1')

  let workerUrl = ''
  if (deployOutput) {
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/)
    if (urlMatch) workerUrl = urlMatch[0]
  }

  console.log('\n' + '='.repeat(50))
  if (workerUrl) {
    console.log(`\n✅ 部署完成！`)
    console.log(`   Worker URL: ${workerUrl}`)
    console.log(`   健康检查: ${workerUrl}/api/health\n`)

    console.log('📋 下一步: 更新小程序前端')
    console.log(`   编辑 apps/miniprogram/src/api/client.js`)
    console.log(`   将 BASE_URL 设为: ${workerUrl}`)
    console.log('   然后用微信开发者工具上传发布\n')
  } else {
    console.log('\n⚠️  部署可能已完成，请检查上方输出中的 Worker URL')
  }
}

main().catch(console.error)
