"use strict";

import mysql from 'mysql2/promise';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

let pool;
let connector;

/**
 * Resolve Cloud SQL IP type from env (PUBLIC | PRIVATE | PSC).
 * Defaults to PUBLIC for simpler local/Cloud Run setups without VPC.
 */
function resolveIpType() {
  const raw = (process.env.CLOUD_SQL_IP_TYPE || 'PUBLIC').toUpperCase();
  if (raw === 'PRIVATE') return IpAddressTypes.PRIVATE;
  if (raw === 'PSC') return IpAddressTypes.PSC;
  return IpAddressTypes.PUBLIC;
}

/**
 * Connection pooling: https://github.com/sidorares/node-mysql2#using-connection-pools
 * @param {*} sql
 * @param {*} params
 * @returns
 */
async function query(sql, params) {
  if (!pool) {
    await connectDB();
  }

  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Hybrid pool:
 * - Cloud SQL Connector when CLOUD_SQL_CONNECTION_NAME is set (Cloud Run / GCP)
 * - Direct TCP via DB_HOST otherwise (local development)
 *
 * @returns {Promise<mysql.Pool>}
 */
async function connectDB() {
  if (pool) {
    return pool;
  }

  const {
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_HOST,
    CLOUD_SQL_CONNECTION_NAME,
  } = process.env;

  if (!DB_USER || !DB_NAME) {
    throw new Error('DB_USER and DB_NAME are required');
  }

  // Cloud Run instances are small; keep pool modest to avoid exhausting Cloud SQL connections.
  const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 5);

  const baseConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  try {
    if (CLOUD_SQL_CONNECTION_NAME) {
      connector = new Connector();
      const clientOpts = await connector.getOptions({
        instanceConnectionName: CLOUD_SQL_CONNECTION_NAME,
        ipType: resolveIpType(),
      });

      pool = mysql.createPool({
        ...clientOpts,
        ...baseConfig,
      });

      console.log(
        `Cloud SQL connector pool ready (${CLOUD_SQL_CONNECTION_NAME}, ${process.env.CLOUD_SQL_IP_TYPE || 'PUBLIC'})`
      );
    } else if (DB_HOST) {
      pool = mysql.createPool({
        ...baseConfig,
        host: DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
      });

      console.log(`Direct TCP database pool ready (${DB_HOST})`);
    } else {
      throw new Error(
        'Set CLOUD_SQL_CONNECTION_NAME (Cloud SQL connector) or DB_HOST (direct TCP)'
      );
    }

    return pool;
  } catch (error) {
    console.error('❌ Database connection pool failed:', error);
    throw error;
  }
}

/**
 * Closes the database connection pool and Cloud SQL connector gracefully.
 */
async function closeDB() {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('Database connection pool closed successfully');
    } catch (error) {
      console.error('Error closing database connection pool:', error);
    }
  }

  if (connector) {
    try {
      connector.close();
      connector = null;
      console.log('Cloud SQL connector closed successfully');
    } catch (error) {
      console.error('Error closing Cloud SQL connector:', error);
    }
  }
}

export { query, connectDB, closeDB };
