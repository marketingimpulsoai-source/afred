// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Capa de Memoria Compartida (Pilar 3)
// Memoria episódica (interacciones recientes) + semántica (conocimiento general)
// Persistencia real vía SQLite (better-sqlite3), sobrevive reinicios.
// Búsqueda semántica por similitud coseno sobre embeddings TF-IDF ligeros
// (sin dependencia de servicios externos de embeddings; se puede swap por
// OpenAI/Gemini embeddings si hay API key disponible — ver embedText()).
// ═══════════════════════════════════════════════════════════════════════
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MemoryRecord, MemorySearchResult, Message } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'alfred.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  language TEXT NOT NULL,
  tool_calls TEXT,
  routing_decision TEXT,
  confidence_score REAL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS memory_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  created_at INTEGER NOT NULL,
  agent_id TEXT,
  importance REAL DEFAULT 0.5,
  tags TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_records(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_records(type);

CREATE TABLE IF NOT EXISTS telemetry (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  query TEXT NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  assigned_agent_name TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  policy_check TEXT NOT NULL,
  tools_invoked_count INTEGER NOT NULL,
  cost_estimate_usd REAL NOT NULL
);
`);

// ─────────────────────────────────────────────────────────────────────────
// Embeddings ligeros (bag-of-words hashing) — funcionan sin API externa.
// Si GEMINI_API_KEY u OPENAI_API_KEY están presentes, embedText() puede
// sustituirse por una llamada real a un servicio de embeddings (ver nota).
// ─────────────────────────────────────────────────────────────────────────
const VECTOR_DIM = 256;

export function embedText(text: string): number[] {
  const vec = new Array(VECTOR_DIM).fill(0);
  const tokens = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9áéíóúñ\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const idx = hash % VECTOR_DIM;
    vec[idx] += 1;
  }

  // Normalización L2
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // ya normalizados L2, dot product = coseno
}

// ─────────────────────────────────────────────────────────────────────────
// Persistencia de mensajes (memoria episódica)
// ─────────────────────────────────────────────────────────────────────────
const insertMessageStmt = db.prepare(`
  INSERT INTO messages (id, session_id, sender, agent_id, agent_name, text, timestamp, created_at, language, tool_calls, routing_decision, confidence_score)
  VALUES (@id, @sessionId, @sender, @agentId, @agentName, @text, @timestamp, @createdAt, @language, @toolCalls, @routingDecision, @confidenceScore)
`);

export function saveMessage(msg: Message): void {
  insertMessageStmt.run({
    id: msg.id,
    sessionId: msg.sessionId,
    sender: msg.sender,
    agentId: msg.agentId || null,
    agentName: msg.agentName || null,
    text: msg.text,
    timestamp: msg.timestamp,
    createdAt: msg.createdAt,
    language: msg.language,
    toolCalls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
    routingDecision: msg.routingDecision ? JSON.stringify(msg.routingDecision) : null,
    confidenceScore: msg.confidenceScore ?? null,
  });

  // También lo indexamos como memoria episódica para recuperación semántica futura
  storeMemory({
    id: 'mem_' + msg.id,
    sessionId: msg.sessionId,
    type: 'episodic',
    content: msg.text,
    createdAt: msg.createdAt,
    agentId: msg.agentId,
    importance: msg.sender === 'user' ? 0.6 : 0.4,
    tags: [msg.sender],
  });
}

export function getMessagesByDay(day: string, sessionId?: string, limit = 1000): Message[] {
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE date(created_at / 1000, 'unixepoch', 'localtime') = ?
      AND (? IS NULL OR session_id = ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(day, sessionId || null, sessionId || null, limit) as any[];

  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    sender: r.sender,
    agentId: r.agent_id || undefined,
    agentName: r.agent_name || undefined,
    text: r.text,
    timestamp: r.timestamp,
    createdAt: r.created_at,
    language: r.language,
    toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
    routingDecision: r.routing_decision ? JSON.parse(r.routing_decision) : undefined,
    confidenceScore: r.confidence_score ?? undefined,
  }));
}

export function getMessagesBySession(sessionId: string, limit = 50): Message[] {
  const rows = db.prepare(`
    SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?
  `).all(sessionId, limit) as any[];
  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    sender: r.sender,
    agentId: r.agent_id || undefined,
    agentName: r.agent_name || undefined,
    text: r.text,
    timestamp: r.timestamp,
    createdAt: r.created_at,
    language: r.language,
    toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
    routingDecision: r.routing_decision ? JSON.parse(r.routing_decision) : undefined,
    confidenceScore: r.confidence_score ?? undefined,
  }));
}

export function getConversationDays(limit = 90): Array<{ day: string; messageCount: number; sessionCount: number }> {
  return db.prepare(`
    SELECT date(created_at / 1000, 'unixepoch', 'localtime') AS day,
           COUNT(*) AS messageCount,
           COUNT(DISTINCT session_id) AS sessionCount
    FROM messages
    GROUP BY day
    ORDER BY day DESC
    LIMIT ?
  `).all(limit) as Array<{ day: string; messageCount: number; sessionCount: number }>;
}

// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
const insertMemoryStmt = db.prepare(`
  INSERT INTO memory_records (id, session_id, type, content, embedding, created_at, agent_id, importance, tags)
  VALUES (@id, @sessionId, @type, @content, @embedding, @createdAt, @agentId, @importance, @tags)
`);

export function storeMemory(record: Omit<MemoryRecord, 'embedding'> & { embedding?: number[] }): void {
  const embedding = record.embedding || embedText(record.content);
  insertMemoryStmt.run({
    id: record.id,
    sessionId: record.sessionId,
    type: record.type,
    content: record.content,
    embedding: JSON.stringify(embedding),
    createdAt: record.createdAt,
    agentId: record.agentId || null,
    importance: record.importance,
    tags: JSON.stringify(record.tags || []),
  });
}

export function searchMemory(query: string, sessionId: string, topK = 5): MemorySearchResult[] {
  const queryVec = embedText(query);
  const rows = db.prepare(`
    SELECT * FROM memory_records WHERE session_id = ? ORDER BY created_at DESC LIMIT 500
  `).all(sessionId) as any[];

  const results: MemorySearchResult[] = rows.map(r => {
    const embedding = JSON.parse(r.embedding);
    const similarity = cosineSimilarity(queryVec, embedding);
    return {
      record: {
        id: r.id,
        sessionId: r.session_id,
        type: r.type,
        content: r.content,
        createdAt: r.created_at,
        agentId: r.agent_id || undefined,
        importance: r.importance,
        tags: JSON.parse(r.tags || '[]'),
      },
      similarity,
    };
  });

  return results
    .filter(r => r.similarity > 0.15) // umbral mínimo de relevancia
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export function pruneOldMemory(sessionId: string, keepLast = 500): void {
  db.prepare(`
    DELETE FROM memory_records WHERE session_id = ? AND id NOT IN (
      SELECT id FROM memory_records WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
    )
  `).run(sessionId, sessionId, keepLast);
}

// ─────────────────────────────────────────────────────────────────────────
// Telemetría persistente
// ─────────────────────────────────────────────────────────────────────────
const insertTelemetryStmt = db.prepare(`
  INSERT INTO telemetry (id, timestamp, created_at, query, assigned_agent_id, assigned_agent_name, latency_ms, tokens_used, confidence, status, policy_check, tools_invoked_count, cost_estimate_usd)
  VALUES (@id, @timestamp, @createdAt, @query, @assignedAgentId, @assignedAgentName, @latencyMs, @tokensUsed, @confidence, @status, @policyCheck, @toolsInvokedCount, @costEstimateUsd)
`);

export function saveTelemetry(log: any): void {
  insertTelemetryStmt.run(log);
}

export function getRecentTelemetry(limit = 50): any[] {
  return db.prepare(`SELECT * FROM telemetry ORDER BY created_at DESC LIMIT ?`).all(limit);
}

export function getTotalQueriesProcessed(): number {
  const row = db.prepare(`SELECT COUNT(*) as c FROM telemetry`).get() as { c: number };
  return row.c;
}

export default db;
