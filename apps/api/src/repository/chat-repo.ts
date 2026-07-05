// ── 聊天记录数据访问层 ──

import type { D1Database } from '@cloudflare/workers-types'
import type { ChatRecord, ChatMessage } from '@personachat/contracts'

export class ChatRepository {
  constructor(private db: D1Database) {}

  async findByUserId(
    userId: string,
    personaId?: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatRecord[]> {
    let sql = 'SELECT * FROM chat_records WHERE user_id = ?'
    const params: unknown[] = [userId]

    if (personaId) {
      sql += ' AND persona_id = ?'
      params.push(personaId)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await this.db.prepare(sql).bind(...params).all()
    return results.map(this.toRecord)
  }

  async save(
    userId: string,
    personaId: string,
    messages: ChatMessage[],
    reply: string,
    model?: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO chat_records (user_id, persona_id, messages, reply, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(userId, personaId, JSON.stringify(messages), reply, model ?? null, Date.now())
      .run()
  }

  // TECH-API-006 D8: delete/findById 独立原子操作
  async findById(id: string): Promise<ChatRecord | null> {
    const row = await this.db.prepare('SELECT * FROM chat_records WHERE id = ?').bind(id).first()
    return row ? this.toRecord(row) : null
  }

  async deleteById(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM chat_records WHERE id = ?').bind(id).run()
  }

  private toRecord(row: Record<string, unknown>): ChatRecord {
    return {
      id: row.id as string | undefined,
      userId: row.user_id as string,
      personaId: row.persona_id as string,
      messages: JSON.parse(row.messages as string) as ChatMessage[],
      reply: row.reply as string,
      model: row.model as string | undefined,
      createdAt: row.created_at as number,
    }
  }
}
