import { describe, it, expect } from 'vitest'
import { personaSchema, personaQuerySchema } from '../src/schemas/persona.js'

describe('personaSchema', () => {
  it('parses a valid persona', () => {
    const result = personaSchema.parse({
      id: 'karpathy-skill',
      name: 'Karpathy',
      description: 'AI researcher',
      category: 'tech_leader',
      systemPrompt: 'You are Andrej Karpathy.',
    })
    expect(result.id).toBe('karpathy-skill')
    expect(result.name).toBe('Karpathy')
    expect(result.category).toBe('tech_leader')
  })

  it('rejects missing required fields', () => {
    expect(() => personaSchema.parse({ id: 'test' })).toThrow()
  })

  it('rejects invalid category', () => {
    expect(() =>
      personaSchema.parse({
        id: 'test',
        name: 'Test',
        category: 'invalid',
        systemPrompt: 'prompt',
      }),
    ).toThrow()
  })

  it('sets defaults for optional fields', () => {
    const result = personaSchema.parse({
      id: 'test',
      name: 'Test',
      category: 'thinker',
      systemPrompt: 'prompt',
    })
    expect(result.description).toBe('')
    expect(result.stargazersCount).toBe(0)
  })
})

describe('personaQuerySchema', () => {
  it('parses optional query fields', () => {
    const result = personaQuerySchema.parse({ category: 'educator', search: 'feynman' })
    expect(result.category).toBe('educator')
    expect(result.search).toBe('feynman')
  })

  it('accepts empty query', () => {
    const result = personaQuerySchema.parse({})
    expect(result.category).toBeUndefined()
    expect(result.search).toBeUndefined()
  })
})
