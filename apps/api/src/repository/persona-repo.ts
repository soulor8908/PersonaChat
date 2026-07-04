// ── 人格数据访问层 ──
// TECH-API-003 D4: 所有 D1 查询使用参数化绑定

import type { D1Database } from '@cloudflare/workers-types'
import type { Persona } from '@personachat/contracts'

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

  async findById(id: string): Promise<Persona | null> {
    const row = await this.db.prepare('SELECT * FROM personas WHERE id = ?').bind(id).first()
    return row ? this.toPersona(row) : null
  }

  // TECH-API-003 D5: create/update/delete 各为独立原子操作
  async create(persona: Persona): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(
        `INSERT INTO personas (id, name, description, category, system_prompt, source_url, stargazers_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind(
        persona.id,
        persona.name,
        persona.description,
        persona.category,
        persona.systemPrompt,
        persona.sourceUrl ?? null,
        now,
        now,
      )
      .run()
  }

  async update(id: string, updates: Partial<Pick<Persona, 'name' | 'description' | 'category' | 'systemPrompt' | 'sourceUrl'>>): Promise<void> {
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
        `INSERT INTO personas (id, name, description, category, system_prompt, source_url, stargazers_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           category = excluded.category,
           system_prompt = excluded.system_prompt,
           source_url = excluded.source_url,
           stargazers_count = excluded.stargazers_count,
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
      createdAt: row.created_at as number | undefined,
      updatedAt: row.updated_at as number | undefined,
    }
  }
}
