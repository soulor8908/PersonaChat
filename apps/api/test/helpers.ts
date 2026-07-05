// ── E2E 测试辅助 ──
// 提供 createTestApp() 工厂，用轻量 in-memory 模拟 D1 数据库
// 完整测试 HTTP → router → service → repository → mock DB 链路

import { createApp } from '../src/server.js'
import type { Env } from '../src/context.js'

// 轻量 D1 mock — 模拟 D1Database 接口，数据存 Map
class MockD1PreparedStatement {
  private sql: string
  private params: unknown[] = []

  constructor(sql: string, private db: MockD1Database) {
    this.sql = sql
  }

  bind(...params: unknown[]) {
    this.params = params
    return this
  }

  async all(): Promise<{ results: Record<string, unknown>[] }> {
    return this.db.executeQuery(this.sql, this.params)
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const { results } = await this.all()
    return (results[0] as T) ?? null
  }

  async run(): Promise<void> {
    await this.db.executeRun(this.sql, this.params)
  }
}

class MockD1Database {
  private tables: Record<string, Record<string, unknown>[]> = {}

  prepare(sql: string) {
    return new MockD1PreparedStatement(sql, this)
  }

  // 简易 SQL 解析 — 支持 INSERT/SELECT/UPDATE/DELETE 基本形式
  private extractTable(sql: string): string {
    const upper = sql.toUpperCase().trim()
    if (upper.startsWith('INSERT')) {
      return sql.match(/INTO\s+(\w+)/i)?.[1] || ''
    }
    if (upper.startsWith('SELECT')) {
      return sql.match(/FROM\s+(\w+)/i)?.[1] || ''
    }
    if (upper.startsWith('UPDATE')) {
      return sql.match(/UPDATE\s+(\w+)/i)?.[1] || ''
    }
    if (upper.startsWith('DELETE')) {
      return sql.match(/FROM\s+(\w+)/i)?.[1] || ''
    }
    return ''
  }

  executeQuery(sql: string, params: unknown[]): { results: Record<string, unknown>[] } {
    const upper = sql.toUpperCase().trim()

    if (upper.startsWith('SELECT')) {
      const table = this.extractTable(sql)
      if (!this.tables[table]) return { results: [] }

      let rows = this.tables[table]
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/is)
      if (whereMatch) {
        rows = rows.filter(row => this.matchWhere(whereMatch[1], row, params))
      }

      // 排序
      const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(DESC|ASC)?/i)
      if (orderMatch) {
        const [_, col, dir] = orderMatch
        rows = [...rows].sort((a, b) => {
          const av = a[col] ?? ''
          const bv = b[col] ?? ''
          return dir === 'DESC' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
        })
      }

      return { results: rows }
    }

    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX')) {
      const table = this.extractTable(sql)
      if (table && !this.tables[table]) {
        this.tables[table] = []
      }
      return { results: [] }
    }

    return { results: [] }
  }

  async executeRun(sql: string, params: unknown[]): Promise<void> {
    const upper = sql.toUpperCase().trim()

    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX')) {
      const table = this.extractTable(sql)
      if (table && !this.tables[table]) {
        this.tables[table] = []
      }
      return
    }

    if (upper.startsWith('INSERT')) {
      const [_, table, colsStr, valsStr] = sql.match(/INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i) || []
      if (table) {
        const cols = colsStr.split(',').map(c => c.trim())
        const row: Record<string, unknown> = {}
        cols.forEach((col, i) => {
          row[col] = params[i] ?? null
        })
        if (!this.tables[table]) this.tables[table] = []
        this.tables[table].push(row)
      }
      return
    }

    if (upper.startsWith('UPDATE')) {
      const table = this.extractTable(sql)
      if (!this.tables[table]) return

      const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/is)
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/is)

      // 计算 SET 子句的参数数量
      let setParamCount = 0
      const setCols: Record<string, unknown> = {}
      if (setMatch) {
        const parts = setMatch[1].split(',')
        for (const part of parts) {
          const m = part.match(/(\w+)\s*=\s*\?/)
          if (m) {
            setCols[m[1]] = params[setParamCount]
            setParamCount++
          }
        }
      }

      // WHERE 参数从 setParamCount 开始
      const whereParams = params.slice(setParamCount)

      for (const row of this.tables[table]) {
        if (!whereMatch || this.matchWhere(whereMatch[1], row, whereParams)) {
          Object.assign(row, setCols)
        }
      }
      return
    }

    if (upper.startsWith('DELETE')) {
      const table = this.extractTable(sql)
      if (!this.tables[table]) return
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/is)
      if (whereMatch) {
        this.tables[table] = this.tables[table].filter(row => !this.matchWhere(whereMatch[1], row, params))
      } else {
        this.tables[table] = []
      }
      return
    }
  }

  private matchWhere(whereClause: string, row: Record<string, unknown>, params: unknown[]): boolean {
    // 简易 WHERE col = ? AND col LIKE ? 解析
    const parts = whereClause.split(/\s+AND\s+/i)
    let paramIdx = 0
    for (const part of parts) {
      const eqMatch = part.trim().match(/(\w+)\s*=\s*\?/)
      const likeMatch = part.trim().match(/(\w+)\s+LIKE\s+\?/i)

      if (eqMatch) {
        const col = eqMatch[1]
        const val = params[paramIdx++]
        if (row[col] !== val) return false
      } else if (likeMatch) {
        const col = likeMatch[1]
        const val = String(params[paramIdx++] || '')
        const rowVal = String(row[col] || '')
        const pattern = val.replace(/%/g, '.*')
        if (!new RegExp(pattern, 'i').test(rowVal)) return false
      }
    }
    return true
  }

  // 测试辅助：清空所有表
  reset() {
    this.tables = {}
  }
}

// 创建测试用 Env
export function createTestEnv(): Env {
  const db = new MockD1Database()
  return {
    DB: db as unknown as Env['DB'],
  }
}

// 获取数据库引用（用于 setup/teardown）
let testDb: MockD1Database | null = null

export function getTestDb(): MockD1Database {
  if (!testDb) {
    testDb = new MockD1Database()
  }
  return testDb
}

// 导出 createApp 供测试使用
export { createApp }
