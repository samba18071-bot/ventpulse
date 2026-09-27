import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import pg from 'pg'

const { Pool } = pg
const schema = readFileSync(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8')

function sqliteSchema() {
  return schema
    .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY')
    .replace(/TIMESTAMPTZ/g, 'TEXT')
    .replace(/BOOLEAN NOT NULL DEFAULT FALSE/g, 'INTEGER NOT NULL DEFAULT 0')
    .replace(/BOOLEAN/g, 'INTEGER')
    .replace(/JSONB/g, 'TEXT')
    .replace(/CREATE INDEX IF NOT EXISTS [^;]+;/g, '')
    .replace(/ON CONFLICT DO NOTHING/g, 'OR IGNORE')
    .replace(/\$\d+/g, '?')
}

class SqliteDatabase {
  constructor(filename) {
    const path = resolve(filename)
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(`PRAGMA journal_mode = WAL;${sqliteSchema()}`)
  }
  async query(text, values = []) { return this.db.prepare(text.replace(/\$\d+/g, '?')).all(...values) }
  async one(text, values = []) { return this.db.prepare(text.replace(/\$\d+/g, '?')).get(...values) || null }
  async execute(text, values = []) {
    const result = this.db.prepare(text.replace(/\s+RETURNING\s+id\s*$/i, '').replace(/\$\d+/g, '?')).run(...values)
    return { ...result, rowCount: result.changes, insertId: result.lastInsertRowid }
  }
  async close() { this.db.close() }
}

class PostgresDatabase {
  constructor(url) { this.pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000 }) }
  async init() { await this.pool.query(schema) }
  async query(text, values = []) { return (await this.pool.query(text, values)).rows }
  async one(text, values = []) { return (await this.pool.query(text, values)).rows[0] || null }
  async execute(text, values = []) { const result = await this.pool.query(text, values); return { rowCount: result.rowCount, insertId: result.rows[0]?.id } }
  async close() { await this.pool.end() }
}

export async function openDatabase() {
  const db = process.env.DATABASE_URL ? new PostgresDatabase(process.env.DATABASE_URL) : new SqliteDatabase(process.env.VENTPULSE_DB || './data/ventpulse.sqlite')
  if (db instanceof PostgresDatabase) await db.init()
  await seed(db)
  return db
}

async function seed(db) {
  if (!(await db.one('SELECT COUNT(*) AS count FROM users')).count) {
    const now = new Date().toISOString()
    await db.execute('INSERT INTO users(email,name,password_hash,role,created_at) VALUES ($1,$2,$3,$4,$5)', ['demo@ventpulse.local', 'Jordan Mills', 'demo', 'operator', now])
  }
  if (!(await db.one('SELECT COUNT(*) AS count FROM buildings')).count) {
    const now = new Date().toISOString()
    for (const values of [['The Ellison', 'New York · 43 floors', 98, 'Nominal', '4,200 TR', 312], ['Riverside House', 'Chicago · 31 floors', 91, 'Watch', '2,850 TR', 248], ['Aster Row', 'Miami · 38 floors', 84, 'Action needed', '3,100 TR', 196]]) {
      await db.execute('INSERT INTO buildings(name,location,health,status,tonnage,units,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [...values, now])
    }
    const ids = await db.query('SELECT id FROM buildings ORDER BY id')
    for (const [building, level, title, detail] of [[ids[2].id, 'critical', 'Chiller 02 · Compressor vibration', 'RMS velocity is 18% above the 14-day baseline.'], [ids[1].id, 'warning', 'AHU-07 · Filter loading', 'Static pressure delta crossed the service threshold.'], [ids[0].id, 'info', 'Gateway heartbeat restored', 'LoRaWAN gateway VP-GW-004 is reporting normally.']]) {
      await db.execute('INSERT INTO alerts(building_id,level,title,detail,created_at) VALUES ($1,$2,$3,$4,$5)', [building, level, title, detail, now])
    }
  }
}
