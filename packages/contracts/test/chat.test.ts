import { describe, it, expect } from 'vitest'
import {
  chatRequestSchema,
  chatMessageSchema,
  chatRecordSchema,
} from '../src/schemas/chat.js'

describe('chatMessageSchema', () => {
  it('parses a valid message', () => {
    const result = chatMessageSchema.parse({ role: 'user', content: 'Hello' })
    expect(result.role).toBe('user')
    expect(result.content).toBe('Hello')
  })

  it('allows null content (for tool_calls messages)', () => {
    const result = chatMessageSchema.parse({ role: 'assistant', content: null })
    expect(result.role).toBe('assistant')
    expect(result.content).toBeNull()
  })

  it('rejects invalid role', () => {
    expect(() => chatMessageSchema.parse({ role: 'admin', content: 'hi' })).toThrow()
  })
})

describe('chatRequestSchema', () => {
  it('parses a valid chat request', () => {
    const result = chatRequestSchema.parse({
      personaId: 'karpathy-skill',
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.personaId).toBe('karpathy-skill')
    expect(result.model).toBeUndefined() // default
  })

  it('rejects empty messages array', () => {
    expect(() =>
      chatRequestSchema.parse({ personaId: 'test', messages: [] }),
    ).toThrow()
  })

  it('accepts custom model', () => {
    const result = chatRequestSchema.parse({
      personaId: 'test',
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-4o-mini',
    })
    expect(result.model).toBe('gpt-4o-mini')
  })
})

describe('chatRecordSchema', () => {
  it('parses a valid record', () => {
    const result = chatRecordSchema.parse({
      userId: 'user_123',
      personaId: 'karpathy-skill',
      messages: [{ role: 'user', content: 'Hello' }],
      reply: 'Hi there!',
      createdAt: Date.now(),
    })
    expect(result.userId).toBe('user_123')
    expect(result.reply).toBe('Hi there!')
  })
})
