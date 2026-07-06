// ── domain/persona-parser 单元测试 ──
// 覆盖: parseSkillMd, extractName, extractSystemPrompt, extractDescription

import { describe, it, expect } from 'vitest'
import {
  parseSkillMd,
  extractName,
  extractSystemPrompt,
  extractDescription,
} from './persona-parser.js'

// ── extractName ──
describe('extractName', () => {
  it('extracts name from H1 heading', () => {
    const content = '# Karpathy Skill\n\nDescription here.'
    // extractName returns full H1 content, -skill suffix stripping only applies when ending with '-skill'
    expect(extractName(content)).toBe('Karpathy Skill')
  })

  it('strips -skill suffix from name', () => {
    const content = '# MyBot-skill\n\nDescription.'
    expect(extractName(content)).toBe('MyBot')
  })

  it('returns null when no H1 found', () => {
    expect(extractName('No heading here\nJust text.')).toBeNull()
  })

  it('returns null for empty content', () => {
    expect(extractName('')).toBeNull()
  })

  it('trims whitespace from extracted name', () => {
    const content = '#   Spaced Name   \n\nDescription.'
    expect(extractName(content)).toBe('Spaced Name')
  })
})

// ── extractSystemPrompt ──
describe('extractSystemPrompt', () => {
  it('extracts content after System Prompt heading', () => {
    const content = '# Bot\n\n## System Prompt\n\nYou are a helpful bot.\nBe kind.\n\n## Other'
    // extractSystemPrompt captures everything after heading (until end of content)
    expect(extractSystemPrompt(content)).toContain('You are a helpful bot.')
    expect(extractSystemPrompt(content)).toContain('Be kind.')
  })

  it('works with ### System Prompt (H3)', () => {
    const content = '### System Prompt\n\nYou are concise.'
    expect(extractSystemPrompt(content)).toBe('You are concise.')
  })

  it('works with case-insensitive heading', () => {
    const content = '## system prompt\n\nAct like Karpathy.'
    expect(extractSystemPrompt(content)).toBe('Act like Karpathy.')
  })

  it('returns null when no System Prompt section found', () => {
    const content = '# Bot\n\nJust some text.\n\n## Description\n\nA bot.'
    expect(extractSystemPrompt(content)).toBeNull()
  })
})

// ── extractDescription ──
describe('extractDescription', () => {
  it('extracts first substantial paragraph', () => {
    const content = '# Title\n\nThis is a very good description of the persona.\n\nMore text.'
    const result = extractDescription(content)
    expect(result).toContain('very good description')
  })

  it('skips heading lines', () => {
    const content = '# Title\n## Subtitle\n\nActual description text here.'
    expect(extractDescription(content)).toBe('Actual description text here.')
  })

  it('skips short lines (< 20 chars)', () => {
    const content = '# Title\n\nShort.\n\nThis is a long enough description line.'
    expect(extractDescription(content)).toBe('This is a long enough description line.')
  })

  it('truncates to maxLen (default 200)', () => {
    const longText = 'A'.repeat(500)
    const content = `# Title\n\n${longText}`
    const result = extractDescription(content)
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('respects custom maxLen', () => {
    const longText = 'A'.repeat(500)
    const content = `# Title\n\n${longText}`
    const result = extractDescription(content, 50)
    expect(result.length).toBeLessThanOrEqual(50)
  })

  it('returns empty string when no suitable paragraph found', () => {
    expect(extractDescription('# Title\n\nShort.\n\nAlso short.')).toBe('')
  })
})

// ── parseSkillMd ──
describe('parseSkillMd', () => {
  const sampleContent = `# Karpathy Skill

AI researcher and engineer persona.

## System Prompt

You are Andrej Karpathy. You think from first principles, favor simplicity, and believe in the power of learning by building. You're direct, technical, and slightly opinionated.

## Other Section

Some extra content.
`

  it('parses full SKILL.md content into ParsedPersona', () => {
    const result = parseSkillMd(sampleContent, 'karpathy-skill', 'https://github.com/karpathy/bot')
    expect(result.id).toBe('karpathy-skill')
    expect(result.name).toBe('Karpathy Skill')
    expect(result.description).toContain('AI researcher')
    expect(result.systemPrompt).toContain('Andrej Karpathy')
  })

  it('truncates system prompt to 8000 chars', () => {
    const longPrompt = '# Bot\n\n## System Prompt\n\n' + 'A'.repeat(10000)
    const result = parseSkillMd(longPrompt, 'bot-skill', 'https://example.com')
    expect(result.systemPrompt.length).toBeLessThanOrEqual(8000)
  })

  it('falls back to content slice when no system prompt section', () => {
    const content = '# Fallback Bot\n\nJust some regular content here. No system prompt section defined.'
    const result = parseSkillMd(content, 'fallback-bot', 'https://example.com')
    expect(result.systemPrompt.length).toBeGreaterThan(0)
    expect(result.systemPrompt).toContain('Just some regular content')
  })

  it('uses repo name as fallback when no H1 name found', () => {
    const content = 'No heading, just content.\n\nThis is a description line here.'
    const result = parseSkillMd(content, 'my-cool-bot-skill', 'https://example.com')
    expect(result.name).toBe('my-cool-bot')
  })
})
