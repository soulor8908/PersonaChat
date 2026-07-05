// ── 人格记忆数据访问层 (TECH-API-011 D12) ──

import type { D1Database } from '@cloudflare/workers-types'

export interface MemoryEntry {
  id: string
  userId: string
  personaId: string
  key: string
  value: string
  category: string
  importance: number
  createdAt: number
}

export class MemoryRepository {
  constructor(private db: D1Database) {}

  async findByUserAndPersona(
    userId: string,
    personaId: string,
    query?: string,
    limit = 10,
  ): Promise<MemoryEntry[]> {
    let sql = 'SELECT * FROM persona_memories WHERE user_id = ? AND persona_id = ?'
    const params: unknown[] = [userId, personaId]

    if (query) {
      // 关键词匹配（简单方案，不引入向量数据库）
      sql += ' AND (key LIKE ? OR value LIKE ?)'
      const pattern = `%${query}%`
      params.push(pattern, pattern)
    }

    // 按 importance DESC + recency 加权排序
    sql += ' ORDER BY importance DESC, created_at DESC LIMIT ?'
    params.push(limit)

    const { results } = await this.db.prepare(sql).bind(...params).all()
    return (results as Array<Record<string, unknown>>).map(this.toEntry)
  }

  async save(entry: Omit<MemoryEntry, 'createdAt'>): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO persona_memories (id, user_id, persona_id, key, value, category, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(entry.id, entry.userId, entry.personaId, entry.key, entry.value, entry.category, entry.importance, now, now)
      .run()
  }

  async deleteByUserAndPersona(userId: string, personaId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM persona_memories WHERE user_id = ? AND persona_id = ?')
      .bind(userId, personaId)
      .run()
  }

  private toEntry(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      personaId: row.persona_id as string,
      key: row.key as string,
      value: row.value as string,
      category: row.category as string,
      importance: row.importance as number,
      createdAt: row.created_at as number,
    }
  }
}
