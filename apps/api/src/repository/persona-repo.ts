// ── 人格数据访问层 ──
// TECH-API-003 D4: 所有 D1 查询使用参数化绑定

import type { D1Database } from '@cloudflare/workers-types'
import type { Persona, PersonaSummary, PersonaSort } from '@personachat/contracts'

export class PersonaRepository {
  constructor(private db: D1Database) {}

  async findAll(category?: string, search?: string): Promise<Persona[]> {
    let sql = 'SELECT * FROM personas WHERE 1=1'
    const params: unknown[] = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY stargazers_count DESC'

    const { results } = await this.db.prepare(sql).bind(...params).all()
    return results.map(this.toPersona)
  }

  // TECH-API-013 D14: 列表查询附带统计摘要 (LEFT JOIN chat_records)
  async findAllWithStats(
    category?: string,
    search?: string,
    sort: PersonaSort = 'popular',
    limit = 50,
  ): Promise<PersonaSummary[]> {
    // 聚合 chat_records 中的评分和消息数
    const statsJoin = `
      LEFT JOIN (
        SELECT
          persona_id,
          COUNT(*) as msg_count,
          CAST(SUM(CASE WHEN rating = 'like' THEN 1 ELSE 0 END) AS REAL)
            / NULLIF(SUM(CASE WHEN rating IN ('like', 'dislike') THEN 1 ELSE 0 END), 0) as like_rate
        FROM chat_records
        GROUP BY persona_id
      ) stats ON personas.id = stats.persona_id
    `

    let sql = `SELECT personas.*, COALESCE(stats.msg_count, 0) as msg_count, COALESCE(stats.like_rate, 0) as like_rate FROM personas ${statsJoin} WHERE 1=1`
    const params: unknown[] = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    // 排序
    switch (sort) {
      case 'popular':
        sql += ' ORDER BY like_rate DESC, msg_count DESC'
        break
      case 'recent':
        sql += ' ORDER BY personas.created_at DESC'
        break
      case 'rated':
        sql += ' ORDER BY msg_count DESC'
        break
    }

    sql += ' LIMIT ?'
    params.push(limit)

    const { results } = await this.db.prepare(sql).bind(...params).all()
    return (results as Array<Record<string, unknown>>).map(r => ({
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string) ?? '',
      category: r.category as Persona['category'],
      systemPrompt: r.system_prompt as string,
      sourceUrl: r.source_url as string | undefined,
      stargazersCount: (r.stargazers_count as number) ?? 0,
      tools: parseTools(r.tools ?? '[]'),
      createdAt: r.created_at as number | undefined,
      updatedAt: r.updated_at as number | undefined,
      likeRate: (r.like_rate as number) ?? 0,
      messageCount: (r.msg_count as number) ?? 0,
    }))
  }

  // TECH-API-013 D14: 热门推荐 TOP N
  async findTop(limit = 10): Promise<PersonaSummary[]> {
    // 按 like_rate * 0.7 + msg_count 归一化 0.3 加权排序
    return this.findAllWithStats(undefined, undefined, 'popular', limit)
  }

  async findById(id: string): Promise<Persona | null> {
    const row = await this.db.prepare('SELECT * FROM personas WHERE id = ?').bind(id).first()
    return row ? this.toPersona(row) : null
  }

  // TECH-API-003 D5: create/update/delete 各为独立原子操作
  async create(persona: Persona): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(
        `INSERT INTO personas (id, name, description, category, system_prompt, source_url, stargazers_count, tools, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .bind(
        persona.id,
        persona.name,
        persona.description,
        persona.category,
        persona.systemPrompt,
        persona.sourceUrl ?? null,
        JSON.stringify(persona.tools ?? []),
        now,
        now,
      )
      .run()
  }

  async update(id: string, updates: Partial<Pick<Persona, 'name' | 'description' | 'category' | 'systemPrompt' | 'sourceUrl' | 'tools'>>): Promise<void> {
    const fields: string[] = []
    const params: unknown[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${this.toDbColumn(key)} = ?`)
        params.push(value)
      }
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await this.db.prepare(`UPDATE personas SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM personas WHERE id = ?').bind(id).run()
  }

  async upsert(persona: Persona): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO personas (id, name, description, category, system_prompt, source_url, stargazers_count, tools, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           category = excluded.category,
           system_prompt = excluded.system_prompt,
           source_url = excluded.source_url,
           stargazers_count = excluded.stargazers_count,
           tools = excluded.tools,
           updated_at = excluded.updated_at`,
      )
      .bind(
        persona.id,
        persona.name,
        persona.description,
        persona.category,
        persona.systemPrompt,
        persona.sourceUrl ?? null,
        persona.stargazersCount,
        JSON.stringify(persona.tools ?? []),
        persona.createdAt ?? Date.now(),
        persona.updatedAt ?? Date.now(),
      )
      .run()
  }

  private toDbColumn(jsKey: string): string {
    const map: Record<string, string> = {
      systemPrompt: 'system_prompt',
      sourceUrl: 'source_url',
      stargazersCount: 'stargazers_count',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
    return map[jsKey] || jsKey
  }

  private toPersona(row: Record<string, unknown>): Persona {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? '',
      category: row.category as Persona['category'],
      systemPrompt: row.system_prompt as string,
      sourceUrl: row.source_url as string | undefined,
      stargazersCount: (row.stargazers_count as number) ?? 0,
      tools: parseTools(row.tools),
      createdAt: row.created_at as number | undefined,
      updatedAt: row.updated_at as number | undefined,
    }
  }
}

function parseTools(tools: unknown): string[] {
  if (Array.isArray(tools)) return tools as string[]
  if (typeof tools === 'string') {
    try { return JSON.parse(tools) as string[] }
    catch (_e) {
      void (_e as Error)
      return []
    }
  }
  return []
}
