// ── 聊天记录数据访问层 ──

import type { D1Database } from '@cloudflare/workers-types'
import type { ChatRecord, ChatMessage, BranchRecord } from '@personachat/contracts'

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
    parentRecordId?: number,
  ): Promise<number> {
    // TECH-API-009 D10: branch_index 自动递增
    let branchIndex = 0
    if (parentRecordId != null) {
      const { results } = await this.db
        .prepare('SELECT MAX(branch_index) as max_idx FROM chat_records WHERE parent_record_id = ?')
        .bind(parentRecordId)
        .all()
      branchIndex = ((results[0] as Record<string, unknown>)?.max_idx as number ?? -1) + 1
    }

    const result = await this.db
      .prepare(
        `INSERT INTO chat_records (user_id, persona_id, messages, reply, model, parent_record_id, branch_index, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(userId, personaId, JSON.stringify(messages), reply, model ?? null, parentRecordId ?? null, branchIndex, Date.now())
      .run()

    // D1 autoincrement 生成的 id 在 meta.last_row_id
    return (result.meta as { last_row_id?: number })?.last_row_id ?? 0
  }

  // TECH-API-009 D10: 查询同父记录的所有分支
  async findBranches(parentRecordId: number): Promise<BranchRecord[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, reply, branch_index, model, created_at FROM chat_records WHERE parent_record_id = ? ORDER BY branch_index ASC',
      )
      .bind(parentRecordId)
      .all()

    return (results as Array<Record<string, unknown>>).map(r => ({
      id: r.id as number,
      reply: r.reply as string,
      branchIndex: r.branch_index as number,
      model: r.model as string | undefined,
      createdAt: r.created_at as number,
    }))
  }

  // TECH-API-006 D8: delete/findById 独立原子操作
  async findById(id: string): Promise<ChatRecord | null> {
    const row = await this.db.prepare('SELECT * FROM chat_records WHERE id = ?').bind(id).first()
    return row ? this.toRecord(row) : null
  }

  async deleteById(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM chat_records WHERE id = ?').bind(id).run()
  }

  // TECH-API-010 D11: 更新消息评分
  async rateMessage(id: string, rating: 'like' | 'dislike'): Promise<void> {
    await this.db
      .prepare('UPDATE chat_records SET rating = ? WHERE id = ?')
      .bind(rating, id)
      .run()
  }

  // TECH-API-010 D11: 获取人格统计数据
  async getPersonaStats(personaId: string): Promise<{
    personaId: string
    totalMessages: number
    likeCount: number
    dislikeCount: number
    totalSessions: number
  }> {
    const { results } = await this.db
      .prepare(
        `SELECT
          COUNT(*) as total_messages,
          SUM(CASE WHEN rating = 'like' THEN 1 ELSE 0 END) as like_count,
          SUM(CASE WHEN rating = 'dislike' THEN 1 ELSE 0 END) as dislike_count,
          COUNT(DISTINCT user_id) as total_sessions
         FROM chat_records WHERE persona_id = ?`,
      )
      .bind(personaId)
      .all()

    const r = results[0] as Record<string, unknown>
    return {
      personaId,
      totalMessages: (r.total_messages as number) ?? 0,
      likeCount: (r.like_count as number) ?? 0,
      dislikeCount: (r.dislike_count as number) ?? 0,
      totalSessions: (r.total_sessions as number) ?? 0,
    }
  }

  private toRecord(row: Record<string, unknown>): ChatRecord {
    return {
      id: row.id as string | undefined,
      userId: row.user_id as string,
      personaId: row.persona_id as string,
      messages: JSON.parse(row.messages as string) as ChatMessage[],
      reply: row.reply as string,
      model: row.model as string | undefined,
      parentRecordId: row.parent_record_id as number | null | undefined,
      branchIndex: (row.branch_index as number | undefined) ?? 0,
      createdAt: row.created_at as number,
    }
  }
}
