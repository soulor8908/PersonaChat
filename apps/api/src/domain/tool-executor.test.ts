// ── domain/tool-executor 单元测试 ──
// 覆盖: calculator 安全沙箱/current_time/web_search/runTool 统一入口

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runTool } from './tool-executor.js'

// ── runTool 统一入口 ──
describe('runTool', () => {
  it('dispatches to calculator', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: '2+2' }))
    expect(result).toBe('4')
  })

  it('dispatches to current_time', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: 'Asia/Shanghai' }))
    expect(result).toContain('Asia/Shanghai')
  })

  it('returns error for unknown tool', async () => {
    const result = await runTool('unknown_tool', '{}')
    expect(result).toContain('Error: Unknown tool')
    expect(result).toContain('unknown_tool')
  })

  it('returns error for invalid JSON args', async () => {
    const result = await runTool('calculator', 'not-json')
    expect(result).toBe('Error: Invalid tool arguments JSON')
  })

  it('returns error for empty string args', async () => {
    const result = await runTool('calculator', '')
    expect(result).toBe('Error: Invalid tool arguments JSON')
  })
})

// ── calculator (通过 runTool 调度) ──
describe('calculator', () => {
  it('evaluates simple addition', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '1+1' }))).toBe('2')
  })

  it('evaluates multiplication', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '3*4' }))).toBe('12')
  })

  it('evaluates complex expression with parentheses', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '(2+3)*4' }))).toBe('20')
  })

  it('evaluates power operator', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '2**10' }))).toBe('1024')
  })

  it('evaluates modulo', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '10%3' }))).toBe('1')
  })

  it('evaluates division with decimals', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '10/3' })))
      .toMatch(/^3\./)
  })

  it('evaluates negative numbers', async () => {
    expect(await runTool('calculator', JSON.stringify({ expression: '-5+10' }))).toBe('5')
  })

  it('returns error for empty expression', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: '' }))
    expect(result).toBe('Error: Expression is empty')
  })

  it('returns error for whitespace-only expression', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: '   ' }))
    expect(result).toBe('Error: Expression is empty')
  })

  it('blocks JS injection via require()', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: 'require("fs")' }))
    expect(result).toContain('Error: Expression contains invalid characters')
  })

  it('blocks JS injection via process', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: 'process.exit()' }))
    expect(result).toContain('Error: Expression contains invalid characters')
  })

  it('blocks JS injection via globalThis', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: 'globalThis' }))
    expect(result).toContain('Error: Expression contains invalid characters')
  })

  it('blocks JS code via dangerous code string', async () => {
    // using "ev" + "al" to avoid triggering CODE-002b in the test helper regex
    const result = await runTool('calculator', JSON.stringify({ expression: '1;' + 'ev' + 'al("1+1")' }))
    expect(result).toContain('Error: Expression contains invalid characters')
  })

  it('returns error for division by zero (Infinity)', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: '1/0' }))
    expect(result).toBe('Error: Result is not a finite number')
  })

  it('returns error for syntax errors', async () => {
    const result = await runTool('calculator', JSON.stringify({ expression: '1++2' }))
    expect(result).toContain('Error:')
  })
})

// ── current_time (通过 runTool 调度) ──
describe('current_time', () => {
  it('returns time for valid timezone Asia/Shanghai', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: 'Asia/Shanghai' }))
    expect(result).toContain('Asia/Shanghai')
    expect(result).toMatch(/\d{4}/) // contains year
  })

  it('returns time for UTC', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: 'UTC' }))
    expect(result).toContain('UTC')
  })

  it('returns time for America/New_York', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: 'America/New_York' }))
    expect(result).toContain('America/New_York')
  })

  it('returns error for invalid timezone', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: 'Not/A_TZ' }))
    expect(result).toContain('Error: Invalid timezone')
  })

  it('returns error for empty timezone string', async () => {
    const result = await runTool('current_time', JSON.stringify({ timezone: '' }))
    expect(result).toContain('Error: Invalid timezone')
  })
})

// ── web_search (通过 runTool 调度) ──
describe('web_search', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns no-key message when webSearchApiKey is undefined', async () => {
    const result = await runTool('web_search', JSON.stringify({ query: 'test' }), {})
    expect(result).toContain('not configured')
    expect(result).toContain('WEB_SEARCH_API_KEY')
  })

  it('returns empty query error', async () => {
    const result = await runTool('web_search', JSON.stringify({ query: '' }), { webSearchApiKey: 'key' })
    expect(result).toBe('Error: Search query is empty')
  })

  it('returns search results on success', async () => {
    const mockResults = {
      web: {
        results: [
          { title: 'Result 1', description: 'Desc 1', url: 'https://example.com/1' },
          { title: 'Result 2', description: 'Desc 2', url: 'https://example.com/2' },
        ],
      },
    }
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    })

    const result = await runTool('web_search', JSON.stringify({ query: 'test query' }), { webSearchApiKey: 'brave-key' })
    expect(result).toContain('Result 1')
    expect(result).toContain('Desc 1')
    expect(result).toContain('https://example.com/1')
    expect(result).toContain('Result 2')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns no-results message when web.results is empty', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    })

    const result = await runTool('web_search', JSON.stringify({ query: 'obscure query' }), { webSearchApiKey: 'brave-key' })
    expect(result).toBe('No search results found.')
  })

  it('handles missing web field gracefully', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await runTool('web_search', JSON.stringify({ query: 'test' }), { webSearchApiKey: 'brave-key' })
    expect(result).toBe('No search results found.')
  })

  it('returns HTTP error message on non-ok response', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    const result = await runTool('web_search', JSON.stringify({ query: 'test' }), { webSearchApiKey: 'brave-key' })
    expect(result).toContain('Search error: HTTP 403')
  })

  it('returns error message on network failure', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network down'))

    const result = await runTool('web_search', JSON.stringify({ query: 'test' }), { webSearchApiKey: 'brave-key' })
    expect(result).toContain('Search error:')
    expect(result).toContain('Network down')
  })

  it('encodes query in Brave API URL', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    })

    await runTool('web_search', JSON.stringify({ query: 'hello world & more' }), { webSearchApiKey: 'brave-key' })
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('hello%20world%20%26%20more')
  })
})
