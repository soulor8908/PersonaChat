// ── 聊天 API 路由 ──

import { z } from 'zod'
import { Hono } from 'hono'
import { chatRequestSchema, builtinModelIdSchema, rateMessageSchema } from '@personachat/contracts'
import type { ChatService } from '../service/chat-svc.js'
import { getDefaultModelId } from '../domain/llm.js'

export function createChatRouter(chatService: ChatService) {
  const router = new Hono()

  // POST /api/chat — 发送聊天消息 (非流式，向后兼容) — TECH-API-009 D10: 接受 parentRecordId
  router.post('/', async (c) => {
    const body = await c.req.json()
    const parsed = chatRequestSchema.parse(body)
    const model = parsed.model ? builtinModelIdSchema.parse(parsed.model) : getDefaultModelId()
    const result = await chatService.chat(
      parsed.personaId,
      parsed.messages,
      model,
      parsed.apiKey,
      parsed.parentRecordId,
    )
    return c.json({ ok: true, reply: result.reply, model: result.model, recordId: result.recordId })
  })

  // POST /api/chats/stream — 流式聊天 (TECH-API-008 D9)
  router.post('/stream', async (c) => {
    const body = await c.req.json()
    const parsed = chatRequestSchema.parse(body)
    const model = parsed.model ? builtinModelIdSchema.parse(parsed.model) : getDefaultModelId()

    const { stream, modelUsed, onComplete } = await chatService.prepareStream(
      parsed.personaId,
      parsed.messages,
      model,
      parsed.apiKey,
      parsed.parentRecordId,
    )

    // 克隆流: 一份发给客户端，一份用于累积完整回复
    const [clientStream, accumulatorStream] = stream.tee()

    // 异步累积完整回复，流结束后保存记录
    const accumulateTask = accumulateReply(accumulatorStream).then(fullReply => {
      onComplete(fullReply)
    })

    // 发 clientStream 前，先把 done/error 事件也转为 SSE
    const enhancedStream = wrapStreamWithDone(clientStream)

    return c.newResponse(enhancedStream, 200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
  })

  // GET /api/chats/:userId — 获取聊天历史
  router.get('/:userId', async (c) => {
    const userId = c.req.param('userId')
    const query = c.req.query()
    // TECH-API-005 D7: query 参数经 Zod 校验
    const parsed = z.object({
      persona_id: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(query)
    const records = await chatService.getHistory(
      userId,
      parsed.persona_id,
      parsed.limit,
      parsed.offset,
    )
    return c.json({ ok: true, data: records })
  })

  // TECH-API-009 D10: 查询对话分支
  router.get('/branches/:recordId', async (c) => {
    const recordId = z.coerce.number().int().min(1).parse(c.req.param('recordId'))
    const branches = await chatService.getBranches(recordId)
    return c.json({ ok: true, data: branches })
  })

  // DELETE /api/chats/:id — 删除聊天记录
  router.delete('/:id', async (c) => {
    const id = c.req.param('id')
    await chatService.deleteRecord(id)
    return c.json({ ok: true })
  })

  // TECH-API-010 D11: 消息评分
  router.put('/:id/rate', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const parsed = rateMessageSchema.parse(body)
    await chatService.rateMessage(id, parsed.rating)
    return c.json({ ok: true })
  })

  return router
}

// ── 辅助函数 ──

// 从 delta 流累积完整回复文本
async function accumulateReply(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let fullReply = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter(l => l.trim())
      for (const line of lines) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'delta' && typeof event.content === 'string') {
            fullReply += event.content
          }
        } catch (_e) {
          void (_e as Error) // skip unparseable SSE chunks
        }
      }
    }
  } catch (_e) {
    void (_e as Error) // reader closed — stream end is expected
  }

  return fullReply
}

// 包装流：检测流自然结束，追加 done 事件
function wrapStreamWithDone(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let messageId = crypto.randomUUID?.() || `msg-${Date.now()}`

  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              messageId,
            }) + '\n'))
            controller.close()
            return
          }
          controller.enqueue(value)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          code: 'STREAM_CLOSE_ERROR',
          message,
        }) + '\n'))
        controller.close()
      }
    },
  })
}
