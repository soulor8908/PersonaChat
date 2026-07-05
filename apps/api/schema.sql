-- PersonaChat D1 Schema
-- SSOT: 此文件为数据库定义的单一事实源

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  source_url TEXT,
  stargazers_count INTEGER DEFAULT 0,
  tools TEXT DEFAULT '[]',  -- TECH-CONTRACT-004 D17: JSON array of tool names
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS chat_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  messages TEXT NOT NULL,
  reply TEXT NOT NULL,
  model TEXT,
  parent_record_id INTEGER,
  branch_index INTEGER DEFAULT 0,
  rating TEXT,  -- TECH-API-010 D11: 'like' | 'dislike'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_records_user ON chat_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_records_persona ON chat_records(persona_id);
CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category);

-- TECH-API-011 D12: 人格记忆表
CREATE TABLE IF NOT EXISTS persona_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'fact',
  importance INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_user_persona ON persona_memories(user_id, persona_id);

-- TECH-API-012 D13: LLM 调用日志表
CREATE TABLE IF NOT EXISTS llm_call_logs (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_call_logs(created_at);
