/**
 * op-sqlite + FTS5 archive: the searchable Notification Center history.
 *
 * Ownership: this DB is owned exclusively by the JS/JSI runtime. It is NOT written by the native
 * listener service (which has no JSI runtime when the app is closed). Instead the native service
 * queues matched messages, and we DRAIN that queue into here whenever the app runs
 * (see archivePendingEvents()).
 *
 * FTS5 note: op-sqlite ships SQLite with FTS5 ONLY because we set {"op-sqlite":{"fts5":true}} in
 * package.json. The system SQLite does not reliably include FTS5 — that is the whole reason we use
 * op-sqlite for search rather than the native android.database.sqlite path used for the queue.
 *
 * Turkish: unicode61 mishandles the dotted/dotless I. We therefore index a pre-normalized
 * `search_text` column (TextNormalizer-equivalent folding) and normalize the query the same way, so
 * search is correct for Turkish regardless of the tokenizer's casing quirks.
 */
import { open, type DB, type QueryResult, type Scalar } from '@op-engineering/op-sqlite';
import type { ArchivedMessage, MessageKind, PendingEvent } from '../types';
import { normalize } from '../matching/normalize';
import { toFtsQuery } from './fts';
import { Notify } from '../native/NotifyModule';

export { toFtsQuery };

function toKinds(kind: MessageKind | MessageKind[]): MessageKind[] {
  return Array.isArray(kind) ? kind : [kind];
}

function kindsClause(kinds: MessageKind[], col = 'm.kind'): { sql: string; params: string[] } {
  const placeholders = kinds.map(() => '?').join(', ');
  return { sql: `${col} IN (${placeholders})`, params: kinds };
}

let db: DB | null = null;
let initPromise: Promise<void> | null = null;

const SELECT_COLS =
  'm.id as id, m.rule_id as ruleId, m.rule_name as ruleName, m.source_package as sourcePackage, ' +
  'm.source_title as sourceTitle, m.body as body, m.matched_keyword as matchedKeyword, ' +
  'm.posted_at as postedAt, m.kind as kind';

function database(): DB {
  if (!db) {
    db = open({ name: 'notifyplus.db' });
  }
  return db;
}

/** Create schema, FTS5 virtual table, and sync triggers. Idempotent; runs once. */
export function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  const d = database();
  initPromise = (async () => {
    await d.execute('PRAGMA journal_mode = WAL;');
    await d.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT,
        rule_name TEXT,
        source_package TEXT,
        source_title TEXT,
        body TEXT NOT NULL,
        matched_keyword TEXT,
        posted_at INTEGER NOT NULL,
        sbn_key TEXT,
        search_text TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'matched'
      );
    `);
    // Additive migration for installs created before the "kind" column existed.
    await d.execute("ALTER TABLE messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'matched';").catch(
      () => {},
    );
    await d.execute(
      'CREATE INDEX IF NOT EXISTS idx_messages_posted ON messages(posted_at DESC);',
    );
    await d.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        search_text,
        content='messages',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      );
    `);
    // External-content sync triggers (note the special 'delete' command for FTS5).
    await d.execute(`
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, search_text) VALUES (new.id, new.search_text);
      END;
    `);
    await d.execute(`
      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, search_text)
        VALUES ('delete', old.id, old.search_text);
      END;
    `);
    await d.execute(`
      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, search_text)
        VALUES ('delete', old.id, old.search_text);
        INSERT INTO messages_fts(rowid, search_text) VALUES (new.id, new.search_text);
      END;
    `);
  })();
  return initPromise;
}

function rowsToMessages(res: QueryResult): ArchivedMessage[] {
  return (res.rows ?? []).map((r) => ({
    id: Number(r.id),
    ruleId: String(r.ruleId ?? ''),
    ruleName: String(r.ruleName ?? ''),
    sourcePackage: String(r.sourcePackage ?? ''),
    sourceTitle: String(r.sourceTitle ?? ''),
    body: String(r.body ?? ''),
    matchedKeyword: String(r.matchedKeyword ?? ''),
    postedAt: Number(r.postedAt),
    kind: (String(r.kind ?? 'matched') as MessageKind),
  }));
}

/** Insert matched messages into the archive (FTS index maintained by triggers). */
export async function insertMessages(events: PendingEvent[]): Promise<void> {
  if (!events.length) return;
  await initDb();
  const d = database();
  const commands: [string, Scalar[]][] = events.map((e) => [
    'INSERT INTO messages (rule_id, rule_name, source_package, source_title, body, ' +
      'matched_keyword, posted_at, sbn_key, search_text, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      e.ruleId,
      e.ruleName,
      e.sourcePackage,
      e.sourceTitle,
      e.body,
      e.matchedKeyword,
      e.postedAt,
      e.sbnKey,
      normalize(`${e.sourceTitle} ${e.body}`),
      e.kind ?? 'matched',
    ],
  ]);
  await d.executeBatch(commands);
}

/** Drain the native queue into the archive. Returns how many were imported. */
export async function archivePendingEvents(): Promise<number> {
  const pending = await Notify.drainPendingEvents();
  if (pending.length) await insertMessages(pending);
  return pending.length;
}

/**
 * Full-text search the archive, ranked by relevance (BM25 via FTS5 `rank`; lower = better).
 * Falls back to recent messages when the query has no usable tokens.
 */
export async function searchMessages(
  query: string,
  kind: MessageKind | MessageKind[] = 'matched',
  limit = 100,
): Promise<ArchivedMessage[]> {
  await initDb();
  const d = database();
  const ftsMatch = toFtsQuery(query);
  if (!ftsMatch) return recentMessages(kind, limit);
  const { sql, params } = kindsClause(toKinds(kind));
  const res = await d.execute(
    `SELECT ${SELECT_COLS} FROM messages_fts f JOIN messages m ON m.id = f.rowid ` +
      `WHERE f.search_text MATCH ? AND ${sql} ORDER BY f.rank LIMIT ?`,
    [ftsMatch, ...params, limit],
  );
  return rowsToMessages(res);
}

export async function recentMessages(
  kind: MessageKind | MessageKind[] = 'matched',
  limit = 100,
  offset = 0,
): Promise<ArchivedMessage[]> {
  await initDb();
  const d = database();
  const { sql, params } = kindsClause(toKinds(kind));
  const res = await d.execute(
    `SELECT ${SELECT_COLS} FROM messages m WHERE ${sql} ORDER BY m.posted_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rowsToMessages(res);
}

export async function messageCount(): Promise<number> {
  await initDb();
  const res = await database().execute('SELECT COUNT(*) as c FROM messages');
  return Number(res.rows?.[0]?.c ?? 0);
}

export async function deleteMessage(id: number): Promise<void> {
  await initDb();
  await database().execute('DELETE FROM messages WHERE id = ?', [id]);
}

export async function clearMessages(kind?: MessageKind | MessageKind[]): Promise<void> {
  await initDb();
  if (!kind) {
    await database().execute('DELETE FROM messages');
    return;
  }
  // No table alias is available in a DELETE statement, so reference the bare column.
  const { sql, params } = kindsClause(toKinds(kind), 'kind');
  await database().execute(`DELETE FROM messages WHERE ${sql}`, params);
}

export async function deleteMessagesOlderThan(cutoffMs: number): Promise<void> {
  await initDb();
  await database().execute('DELETE FROM messages WHERE posted_at < ?', [cutoffMs]);
}
