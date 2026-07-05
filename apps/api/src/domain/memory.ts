// ── 人格记忆领域逻辑 (TECH-API-011 D12) ──

import type { ChatMessage } from '@personachat/contracts'

// TECH-API-011 D12: 从对话中提取记忆事实
export function buildMemoryExtractionPrompt(
  personaName: string,
  conversationSummary: string,
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a memory extraction agent for "${personaName}". Extract key facts about the user from this conversation. Return a JSON array of facts. Each fact must have: key (short label), value (the fact), category (one of: personal, preference, fact, context), importance (1-5, where 5=critical identity info, 1=trivial). Return ONLY valid JSON like: [{"key":"name","value":"小明","category":"personal","importance":5}]. Return [] if no new facts found.`,
    },
    {
      role: 'user',
      content: `Conversation:\n${conversationSummary}`,
    },
  ]
}

// TECH-API-011 D12: 格式化记忆注入到系统提示
export function injectMemories(
  systemPrompt: string,
  memories: Array<{ key: string; value: string }>,
): string {
  if (memories.length === 0) return systemPrompt
  const memoryLines = memories.map(m => `- ${m.key}: ${m.value}`).join('\n')
  return `${systemPrompt}\n\n[User Context — use naturally in conversation, do NOT list explicitly]\n${memoryLines}`
}

// TECH-API-011 D12: 从对话提取摘要（最后 N 条消息）用于记忆提取
export function summarizeConversation(
  messages: ChatMessage[],
  reply: string,
  maxChars = 2000,
): string {
  const text = messages.map(m => `[${m.role}]: ${m.content}`).join('\n') + `\n[assistant]: ${reply}`
  return text.length > maxChars ? text.slice(-maxChars) : text
}
