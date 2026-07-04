#!/usr/bin/env node
// ── 生成小程序 Tab 图标（PNG，纯 Node.js，无外部依赖）──

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSETS = join(__dirname, '..', 'apps', 'miniprogram', 'assets')
mkdirSync(ASSETS, { recursive: true })

const SIZE = 81

// 调色板
const COLORS = {
  'tab-persona': { idle: '#667eea', active: '#5a67d8', label: 'P' },
  'tab-chat': { idle: '#667eea', active: '#5a67d8', label: 'C' },
  'tab-profile': { idle: '#667eea', active: '#5a67d8', label: 'U' },
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([t, data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([len, t, data, c])
}

function makePNG(r, g, b, active = false) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // 生成像素数据
  const raw = []
  for (let y = 0; y < SIZE; y++) {
    raw.push(0) // filter: none
    for (let x = 0; x < SIZE; x++) {
      const cx = x - SIZE / 2
      const cy = y - SIZE / 2
      const dist = Math.sqrt(cx * cx + cy * cy)
      const radius = SIZE / 2 - 2

      if (dist <= radius) {
        // 圆形内部：渐变效果
        const brightness = 1 - (dist / radius) * 0.25
        raw.push(Math.min(255, Math.round(r * brightness)))
        raw.push(Math.min(255, Math.round(g * brightness)))
        raw.push(Math.min(255, Math.round(b * brightness)))
        raw.push(255)
      } else {
        raw.push(0, 0, 0, 0) // 透明
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw))
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    iend,
  ])
}

for (const [name, c] of Object.entries(COLORS)) {
  const hex = c.idle.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  writeFileSync(join(ASSETS, `${name}.png`), makePNG(r, g, b, false))
  console.log(`  ✅ ${name}.png`)

  // Active variant
  const hexA = c.active.replace('#', '')
  const rA = parseInt(hexA.slice(0, 2), 16)
  const gA = parseInt(hexA.slice(2, 4), 16)
  const bA = parseInt(hexA.slice(4, 6), 16)

  writeFileSync(join(ASSETS, `${name}-active.png`), makePNG(rA, gA, bA, true))
  console.log(`  ✅ ${name}-active.png`)
}

console.log('\n  🎯 共生成 6 个图标')
