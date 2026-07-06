// ── domain/memory 单元测试 ──
// 覆盖: buildMemoryExtractionPrompt, injectMemories, summarizeConversation

import { describe, it, expect } from 'vitest'
import {
  buildMemoryExtractionPrompt,
  injectMemories,
  summarizeConversation,
} from './memory.js'

// ── buildMemoryExtractionPrompt ──
describe('buildMemoryExtractionPrompt', () => {
  it('returns system + user messages', () => {
    const msgs = buildMemoryExtractionPrompt('Karpathy', 'User: Hello\nAI: Hi there!')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
  })

  it('includes persona name in system prompt', () => {
    const msgs = buildMemoryExtractionPrompt('爱因斯坦', 'some conversation')
    expect(msgs[0].content).toContain('爱因斯坦')
  })

  it('includes conversation summary in user message', () => {
    const summary = 'User said they like dogs.'
    const msgs = buildMemoryExtractionPrompt('Bot', summary)
    expect(msgs[1].content).toContain(summary)
  })

  it('asks for JSON array output', () => {
    const msgs = buildMemoryExtractionPrompt('Test', 'conv')
    expect(msgs[0].content).toContain('JSON array')
  })

  it('mentions required fields: key, value, category, importance', () => {
    const msgs = buildMemoryExtractionPrompt('Test', 'conv')
    expect(msgs[0].content).toContain('key')
    expect(msgs[0].content).toContain('value')
    expect(msgs[0].content).toContain('category')
    expect(msgs[0].content).toContain('importance')
  })
})

// ── injectMemories ──
describe('injectMemories', () => {
  const basePrompt = 'You are a helpful assistant.'

  it('returns original prompt when memories is empty', () => {
    const result = injectMemories(basePrompt, [])
    expect(result).toBe(basePrompt)
  })

  it('appends memories to system prompt', () => {
    const memories = [
      { key: 'name', value: '小明' },
      { key: 'age', value: '25' },
    ]
    const result = injectMemories(basePrompt, memories)
    expect(result).toContain('[User Context')
    expect(result).toContain('- name: 小明')
    expect(result).toContain('- age: 25')
    expect(result).toContain('use naturally in conversation')
  })

  it('includes single memory correctly', () => {
    const result = injectMemories(basePrompt, [{ key: 'city', value: '北京' }])
    expect(result).toContain('- city: 北京')
  })

  it('does NOT contain listing instructions when memories is empty (no injection)', () => {
    const result = injectMemories(basePrompt, [])
    expect(result).not.toContain('[User Context')
  })
})

// ── summarizeConversation ──
describe('summarizeConversation', () => {
  it('joins messages with role labels', () => {
    const msgs = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi!' },
    ]
    const result = summarizeConversation(msgs, 'I am fine.')
    expect(result).toContain('[user]: Hello')
    expect(result).toContain('[assistant]: Hi!')
    expect(result).toContain('[assistant]: I am fine.')
  })

  it('returns full text when under maxChars', () => {
    const msgs = [{ role: 'user' as const, content: 'Hi' }]
    const result = summarizeConversation(msgs, 'Hey', 10000)
    expect(result).toBe('[user]: Hi\n[assistant]: Hey')
  })

  it('truncates from start when over maxChars', () => {
    const longContent = 'A'.repeat(3000)
    const msgs = [{ role: 'user' as const, content: longContent }]
    const result = summarizeConversation(msgs, 'reply', 200)
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('uses default maxChars of 2000', () => {
    const msgs = [
      { role: 'user' as const, content: '你好'.repeat(100) },
    ]
    const result = summarizeConversation(msgs, '你好'.repeat(100))
    expect(result.length).toBeLessThanOrEqual(2000)
  })

  it('preserves the end of conversation when truncating', () => {
    const msgs = [
      { role: 'user' as const, content: 'First message' },
      { role: 'assistant' as const, content: 'First reply' },
    ]
    const result = summarizeConversation(msgs, 'Last reply', 50)
    // Should preserve the end portion
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result).toContain('Last reply')
  })
})
