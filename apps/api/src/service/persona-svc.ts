// ── 人格业务逻辑层 ──
// TECH-API-004 D6: 业务层只编排，不做数据库操作

import type { Persona, PersonaQuery, PersonaSource, PersonaCreate, PersonaUpdate, PersonaSummary, PersonaSort } from '@personachat/contracts'
import { PersonaRepository } from '../repository/persona-repo.js'
import { Errors } from '../errors.js'
import { parseSkillMd } from '../domain/persona-parser.js'

function generateId(): string {
  return crypto.randomUUID()
}

export class PersonaService {
  constructor(private repo: PersonaRepository) {}

  // TECH-API-013 D14: 列表查询支持排序 + 统计摘要
  async list(query: PersonaQuery & { sort?: PersonaSort }): Promise<PersonaSummary[]> {
    return this.repo.findAllWithStats(query.category, query.search, query.sort ?? 'popular')
  }

  // TECH-API-013 D14: 热门推荐 TOP 10
  async listHot(limit = 10): Promise<PersonaSummary[]> {
    return this.repo.findTop(limit)
  }

  async getById(id: string): Promise<Persona> {
    const persona = await this.repo.findById(id)
    if (!persona) throw Errors.notFound('Persona')
    return persona
  }

  async create(input: PersonaCreate): Promise<Persona> {
    // TECH-API-004 D5: create 生成 id + timestamps
    const now = Date.now()
    const persona: Persona = {
      id: generateId(),
      name: input.name,
      description: input.description,
      category: input.category,
      systemPrompt: input.systemPrompt,
      sourceUrl: input.sourceUrl,
      stargazersCount: 0,
      tools: input.tools ?? [],
      createdAt: now,
      updatedAt: now,
    }

    await this.repo.create(persona)
    return persona
  }

  async update(id: string, input: PersonaUpdate): Promise<Persona> {
    // TECH-API-004 D5: update 先查存在性，再原子更新
    const existing = await this.repo.findById(id)
    if (!existing) throw Errors.notFound('Persona')

    await this.repo.update(id, {
      name: input.name,
      description: input.description,
      category: input.category,
      systemPrompt: input.systemPrompt,
      sourceUrl: input.sourceUrl ?? undefined,
      tools: input.tools,
    })

    // 返回更新后的实体
    const updated = await this.repo.findById(id)
    if (!updated) throw Errors.internal('Persona disappeared after update')
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw Errors.notFound('Persona')
    await this.repo.delete(id)
  }

  async syncFromSource(source: PersonaSource): Promise<Persona> {
    const url = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/main/SKILL.md`
    const res = await fetch(url)

    if (!res.ok) {
      throw Errors.internal(`Failed to fetch ${url}: ${res.status}`)
    }

    const content = await res.text()
    const parsed = parseSkillMd(content, source.repo, url)

    const persona: Persona = {
      ...parsed,
      category: source.category,
      sourceUrl: `https://github.com/${source.owner}/${source.repo}`,
      stargazersCount: 0,
      tools: [],
    }

    await this.repo.upsert(persona)
    return persona
  }
}
