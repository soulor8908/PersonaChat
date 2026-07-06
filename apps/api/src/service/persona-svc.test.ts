// ── service/persona-svc 单元测试 ──
// Mock PersonaRepository，验证编排逻辑

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PersonaService } from './persona-svc.js'
import { PersonaRepository } from '../repository/persona-repo.js'
import type { Persona, PersonaSummary } from '@personachat/contracts'
import { Errors } from '../errors.js'
import { AppError } from '../errors.js'

// Mock PersonaRepository
vi.mock('../repository/persona-repo.js', () => {
  const actual = vi.importActual('../repository/persona-repo.js')
  return {
    PersonaRepository: vi.fn(),
  }
})

function mockPersonaRepo() {
  const repoMethods = {
    findAll: vi.fn(),
    findAllWithStats: vi.fn(),
    findTop: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  }

  const PersonaRepoMock = vi.mocked(PersonaRepository)
  PersonaRepoMock.mockImplementation(() => repoMethods as unknown as PersonaRepository)

  return repoMethods
}

function createService(repoMethods: ReturnType<typeof mockPersonaRepo>) {
  const repo = new PersonaRepository(null as unknown as any)
  // replace methods with our mocks
  Object.assign(repo, repoMethods)
  return new PersonaService(repo)
}

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'test-id-1',
    name: 'Test Persona',
    description: 'A test persona',
    category: 'custom',
    systemPrompt: 'You are a test.',
    stargazersCount: 0,
    tools: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeSummary(overrides: Partial<PersonaSummary> = {}): PersonaSummary {
  return {
    id: 'test-id-1',
    name: 'Test Persona',
    description: 'A test persona',
    category: 'custom',
    systemPrompt: 'You are a test.',
    stargazersCount: 0,
    tools: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    likeRate: 0.8,
    messageCount: 42,
    ...overrides,
  }
}

// ── Tests ──
describe('PersonaService', () => {
  let repoMethods: ReturnType<typeof mockPersonaRepo>
  let service: PersonaService

  beforeEach(() => {
    repoMethods = mockPersonaRepo()
    service = createService(repoMethods)
  })

  describe('list', () => {
    it('returns results from repository with default sort', async () => {
      const summaries = [makeSummary({ id: 'p1' }), makeSummary({ id: 'p2' })]
      repoMethods.findAllWithStats.mockResolvedValue(summaries)

      const result = await service.list({})
      expect(result).toEqual(summaries)
      expect(repoMethods.findAllWithStats).toHaveBeenCalledWith(undefined, undefined, 'popular')
    })

    it('passes category and search to repo', async () => {
      repoMethods.findAllWithStats.mockResolvedValue([])
      await service.list({ category: 'tech_leader', search: 'karpathy' })
      expect(repoMethods.findAllWithStats).toHaveBeenCalledWith('tech_leader', 'karpathy', 'popular')
    })

    it('passes sort parameter to repo', async () => {
      repoMethods.findAllWithStats.mockResolvedValue([])
      await service.list({ sort: 'recent' })
      expect(repoMethods.findAllWithStats).toHaveBeenCalledWith(undefined, undefined, 'recent')
    })
  })

  describe('listHot', () => {
    it('returns top personas from repository', async () => {
      const summaries = [makeSummary({ id: 'hot1' })]
      repoMethods.findTop.mockResolvedValue(summaries)

      const result = await service.listHot()
      expect(result).toEqual(summaries)
      expect(repoMethods.findTop).toHaveBeenCalledWith(10)
    })

    it('passes custom limit to findTop', async () => {
      repoMethods.findTop.mockResolvedValue([])
      await service.listHot(5)
      expect(repoMethods.findTop).toHaveBeenCalledWith(5)
    })
  })

  describe('getById', () => {
    it('returns persona when found', async () => {
      const persona = makePersona()
      repoMethods.findById.mockResolvedValue(persona)

      const result = await service.getById('test-id-1')
      expect(result).toEqual(persona)
    })

    it('throws notFound when persona missing', async () => {
      repoMethods.findById.mockResolvedValue(null)
      await expect(service.getById('missing')).rejects.toThrow(AppError)
      await expect(service.getById('missing')).rejects.toThrow('Persona not found')
    })
  })

  describe('create', () => {
    it('creates persona with generated id and timestamps', async () => {
      repoMethods.create.mockResolvedValue(undefined)
      const input = {
        name: 'New Bot',
        description: 'A new bot',
        category: 'custom' as const,
        systemPrompt: 'Be helpful.',
        tools: [] as string[],
      }

      const persona = await service.create(input)
      expect(persona.name).toBe('New Bot')
      expect(persona.id).toBeDefined()
      expect(persona.id.length).toBeGreaterThan(0)
      expect(persona.stargazersCount).toBe(0)
      expect(persona.createdAt).toBeDefined()
      expect(persona.updatedAt).toBeDefined()
      expect(repoMethods.create).toHaveBeenCalled()
    })

    it('uses tools from input if provided', async () => {
      repoMethods.create.mockResolvedValue(undefined)
      const persona = await service.create({
        name: 'Tool Bot',
        description: 'Bot with tools',
        category: 'custom',
        systemPrompt: 'Use tools.',
        tools: ['calculator', 'current_time'],
      })
      expect(persona.tools).toEqual(['calculator', 'current_time'])
    })

    it('defaults tools to empty array', async () => {
      repoMethods.create.mockResolvedValue(undefined)
      const persona = await service.create({
        name: 'No Tool Bot',
        description: 'Bot without tools',
        category: 'custom',
        systemPrompt: 'No tools.',
        tools: [],
      })
      expect(persona.tools).toEqual([])
    })
  })

  describe('update', () => {
    it('updates existing persona', async () => {
      const existing = makePersona({ name: 'Old Name' })
      const updated = makePersona({ name: 'New Name' })
      repoMethods.findById.mockResolvedValueOnce(existing) // existence check
      repoMethods.update.mockResolvedValue(undefined)
      repoMethods.findById.mockResolvedValueOnce(updated) // return updated

      const result = await service.update('test-id-1', { name: 'New Name' })
      expect(result.name).toBe('New Name')
      expect(repoMethods.update).toHaveBeenCalledWith('test-id-1', expect.objectContaining({ name: 'New Name' }))
    })

    it('throws notFound when persona does not exist', async () => {
      repoMethods.findById.mockResolvedValue(null)
      await expect(service.update('missing', { name: 'X' })).rejects.toThrow('Persona not found')
    })

    it('passes tools field when provided in update', async () => {
      const existing = makePersona()
      repoMethods.findById.mockResolvedValueOnce(existing)
      repoMethods.update.mockResolvedValue(undefined)
      repoMethods.findById.mockResolvedValueOnce(makePersona({ tools: ['calculator'] }))

      await service.update('test-id-1', { tools: ['calculator'] })
      expect(repoMethods.update).toHaveBeenCalledWith('test-id-1', expect.objectContaining({ tools: ['calculator'] }))
    })
  })

  describe('delete', () => {
    it('deletes existing persona', async () => {
      repoMethods.findById.mockResolvedValue(makePersona())
      repoMethods.delete.mockResolvedValue(undefined)

      await expect(service.delete('test-id-1')).resolves.not.toThrow()
      expect(repoMethods.delete).toHaveBeenCalledWith('test-id-1')
    })

    it('throws notFound when persona does not exist', async () => {
      repoMethods.findById.mockResolvedValue(null)
      await expect(service.delete('missing')).rejects.toThrow('Persona not found')
    })
  })

  describe('syncFromSource', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it('syncs persona from GitHub SKILL.md', async () => {
      const skillMd = `# Karpathy Skill

AI researcher persona.

## System Prompt

You are Andrej Karpathy. Think from first principles.`

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => skillMd,
      }) as unknown as typeof fetch

      repoMethods.upsert.mockResolvedValue(undefined)

      const result = await service.syncFromSource({
        owner: 'karpathy',
        repo: 'karpathy-skill',
        category: 'tech_leader',
      })

      expect(result.name).toContain('Karpathy')
      expect(result.category).toBe('tech_leader')
      expect(result.sourceUrl).toContain('github.com/karpathy/karpathy-skill')
      expect(repoMethods.upsert).toHaveBeenCalled()
    })

    it('throws on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as unknown as typeof fetch

      await expect(service.syncFromSource({
        owner: 'nonexistent',
        repo: 'fake-skill',
        category: 'custom',
      })).rejects.toThrow(AppError)
    })
  })
})
