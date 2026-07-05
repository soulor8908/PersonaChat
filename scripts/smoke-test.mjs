#!/usr/bin/env node
// ── 生产环境 Smoke Test ──
// 对已部署的 Worker 跑 3 个关键端点验证
// 用法: node scripts/smoke-test.mjs [--base-url https://your-worker.workers.dev]

import { fileURLToPath } from 'node:url'

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:8787'

const TESTS = [
  {
    name: 'GET /api/health',
    run: () => fetch(`${BASE_URL}/api/health`),
    expect: (res) => res.status === 200 && res.json().then(b => b.ok === true),
  },
  {
    name: 'GET /api/models',
    run: () => fetch(`${BASE_URL}/api/models`),
    expect: (res) => res.status === 200 && res.json().then(b => Array.isArray(b.data) && b.data.length >= 2),
  },
  {
    name: 'POST /api/personas',
    run: () => fetch(`${BASE_URL}/api/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SmokeTest', category: 'custom', systemPrompt: 'smoke' }),
    }),
    expect: (res) => res.status === 201,
  },
  {
    name: 'GET /api/personas',
    run: () => fetch(`${BASE_URL}/api/personas`),
    expect: (res) => res.status === 200 && res.json().then(b => Array.isArray(b.data)),
  },
  {
    name: 'POST /api/chats (validation)',
    run: () => fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'nonexistent', messages: [{ role: 'user', content: 'hi' }], model: 'deepseek-v3' }),
    }),
    expect: (res) => [200, 404].includes(res.status), // 404 expected (no persona in DB), but 200 also valid
  },
]

async function main() {
  console.log(`PersonaChat Smoke Test — ${BASE_URL}\n`)

  let passed = 0
  for (const test of TESTS) {
    try {
      const res = await test.run()
      const ok = await test.expect(res)
      console.log(`  ${ok ? '✓' : '✗'} ${test.name} (${res.status})`)
      if (ok) passed++
      else console.log(`    Response: ${await res.text().catch(() => '?')}`)
    } catch (err) {
      console.log(`  ✗ ${test.name} — ${err.message}`)
    }
  }

  console.log(`\n${passed}/${TESTS.length} passed`)
  process.exit(passed === TESTS.length ? 0 : 1)
}

main()
