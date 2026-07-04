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
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_records_user ON chat_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_records_persona ON chat_records(persona_id);
CREATE INDEX IF NOT EXISTS idx_personas_category ON personas(category);
