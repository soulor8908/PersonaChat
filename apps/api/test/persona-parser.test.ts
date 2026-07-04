import { describe, it, expect } from 'vitest'
import {
  parseSkillMd,
  extractName,
  extractSystemPrompt,
  extractDescription,
} from '../src/domain/persona-parser.js'

const SAMPLE_SKILL = `# Karpathy-Skill

Andrej Karpathy is a renowned AI researcher focused on deep learning.

## System Prompt

You are Andrej Karpathy. You think in first principles and love clean abstractions.

Additional context about your personality.
`

const NO_HEADER_CONTENT = `Just some text without a proper header.
No name to extract from this.`

describe('extractName', () => {
  it('extracts name from markdown header', () => {
    expect(extractName(SAMPLE_SKILL)).toBe('Karpathy')
  })

  it('returns null when no header found', () => {
    expect(extractName(NO_HEADER_CONTENT)).toBeNull()
  })
})

describe('extractSystemPrompt', () => {
  it('extracts content after System Prompt heading', () => {
    const prompt = extractSystemPrompt(SAMPLE_SKILL)
    expect(prompt).toContain('You are Andrej Karpathy')
    expect(prompt).toContain('Additional context')
  })

  it('returns null when no System Prompt section', () => {
    expect(extractSystemPrompt('# Just a title')).toBeNull()
  })
})

describe('extractDescription', () => {
  it('takes first non-empty non-header line', () => {
    const desc = extractDescription(SAMPLE_SKILL)
    expect(desc).toContain('Andrej Karpathy')
    expect(desc.length).toBeLessThanOrEqual(200)
  })

  it('returns empty for no content', () => {
    expect(extractDescription('# Only Header')).toBe('')
  })
})

describe('parseSkillMd', () => {
  it('parses complete skill markdown', () => {
    const result = parseSkillMd(SAMPLE_SKILL, 'karpathy-skill', 'https://example.com')
    expect(result.id).toBe('karpathy-skill')
    expect(result.name).toBe('Karpathy')
    expect(result.description).toContain('Andrej Karpathy')
    expect(result.systemPrompt).toContain('You are Andrej Karpathy')
  })

  it('handles empty content gracefully', () => {
    const result = parseSkillMd('', 'empty-repo', 'https://example.com')
    expect(result.id).toBe('empty-repo')
    expect(result.name).toBe('empty-repo')
    expect(result.systemPrompt.length).toBeLessThanOrEqual(8000)
  })

  it('strips -skill suffix from repo name for id', () => {
    const result = parseSkillMd('', 'my-cool-skill', 'https://example.com')
    expect(result.id).toBe('my-cool-skill')
  })
})
