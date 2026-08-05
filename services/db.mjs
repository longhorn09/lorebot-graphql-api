"use strict";

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Required for Node / Cloud Run WebSocket connections to Neon.
neonConfig.webSocketConstructor = ws;

let pool;
let db;

/**
 * Convert mysql2-style `?` placeholders to Postgres `$1`, `$2`, ...
 * @param {string} sql
 * @returns {string}
 */
function toPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

const INT_FIELD_KEYS = new Set([
  'LORE_ID',
  'PERSON_ID',
  'APPLY',
  'WEIGHT',
  'CAPACITY',
  'CONTAINER_SIZE',
  'CHARGES',
  'SPEED',
  'ACCURACY',
  'POWER',
  'CLAN_ID',
  'TOTAL',
  'TEST',
]);

/**
 * Map Postgres row keys to GraphQL-friendly shapes:
 * - lowercase columns (lore_id) → LORE_ID
 * - already-quoted mixed-case aliases (TBL_SRC) preserved
 * - Recent.submitter stays lowercase for the GraphQL schema
 * - bigint/numeric strings coerced for GraphQL Int fields
 * @param {Record<string, unknown>} row
 */
function mapRowKeys(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return row;
  }

  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = key === 'submitter' || /[A-Z]/.test(key) ? key : key.toUpperCase();
    let mappedValue = value;

    if (
      typeof value === 'string' &&
      /^-?\d+$/.test(value) &&
      INT_FIELD_KEYS.has(mappedKey)
    ) {
      mappedValue = Number(value);
    }

    mapped[mappedKey] = mappedValue;
  }
  return mapped;
}

/**
 * Execute a parameterized query. Accepts mysql-style `?` placeholders.
 * Returns an array of row objects (GraphQL-cased keys).
 * @param {string} sql
 * @param {unknown[]} [params]
 */
async function query(sql, params = []) {
  if (!pool) {
    await connectDB();
  }

  try {
    const text = toPgPlaceholders(sql);
    const result = await pool.query(text, params);
    return (result.rows || []).map(mapRowKeys);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Neon serverless pool via WebSockets (suited to long-lived Cloud Run instances).
 * Requires DATABASE_URL. Optional DB_SCHEMA (default: lorebot).
 */
async function connectDB() {
  if (pool) {
    return db;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Neon Postgres');
  }

  const schema = process.env.DB_SCHEMA || 'lorebot';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid DB_SCHEMA value: ${schema}`);
  }
  const max = Number(process.env.DB_CONNECTION_LIMIT || 5);

  try {
    pool = new Pool({
      connectionString,
      max,
    });

    // Ensure unqualified table/function names resolve to the lorebot schema.
    pool.on('connect', (client) => {
      client.query(`SET search_path TO "${schema}", public`);
    });

    // Warm one connection and set search_path for the first client.
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}", public`);
      await client.query('SELECT 1');
    } finally {
      client.release();
    }

    db = drizzle(pool);
    console.log(`Neon Postgres pool ready (schema=${schema}, max=${max})`);
    return db;
  } catch (error) {
    console.error('❌ Neon database connection pool failed:', error);
    throw error;
  }
}

async function closeDB() {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      db = null;
      console.log('Neon database pool closed successfully');
    } catch (error) {
      console.error('Error closing Neon database pool:', error);
    }
  }
}

export { query, connectDB, closeDB, db };
