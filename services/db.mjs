"use strict";
//const mysql = require('mysql2/promise');
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();


let pool; // Declare a variable to hold the connection pool

/**
 * Connection pooling: https://github.com/sidorares/node-mysql2#using-connection-pools
 * @param {*} sql 
 * @param {*} params 
 * @returns 
 */
async function query(sql, params) {
  // Ensure we have a connection pool
  if (!pool) {
    await connectDB();
  }
  
  try {
    // Use the connection pool instead of creating individual connections
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Establishes and returns a connection pool to the Cloud SQL MySQL database.
 * Uses environment variables for configuration.
 * @returns {Promise<mysql.Pool>} A promise that resolves to the database connection pool object.
 */
async function connectDB() {
  if (pool) {
    return pool; // Return existing pool if already created
  }

  try {
    // Database connection pool configuration.
    // IMPORTANT: Replace these placeholders with your actual Cloud SQL instance details.
    // For production, use environment variables, Secret Manager, or IAM service accounts.
    pool = mysql.createPool({
      host: process.env.DB_HOST, // e.g., '127.0.0.1' for local or public IP/private IP for Cloud SQL
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true, // If true, the pool will queue connections if none are available
      connectionLimit: 10,      // Increased max number of connections
      queueLimit: 0,            // Unlimited queueing of connections
      acquireTimeout: 60000,    // 60 seconds timeout for acquiring connections
      timeout: 60000,           // 60 seconds timeout for queries
      // Optional: For Cloud SQL connection string or Unix socket
      // socketPath: process.env.DB_SOCKET_PATH || '/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME',
      // You might need to configure SSL/TLS for secure connections in production
      // ssl: {
      //   rejectUnauthorized: false // Set to true and provide CAs for production
      // }
    });
    
    // Add event listeners for pool monitoring
    pool.on('connection', (connection) => {
      console.log('New database connection established');
    });
    
    pool.on('acquire', (connection) => {
      console.log('Connection acquired from pool');
    });
    
    pool.on('release', (connection) => {
      console.log('Connection released back to pool');
    });
    return pool;
  } catch (error) {
    console.error('❌ Database connection pool failed:', error);
    // In a real application, you might want to retry or handle this more gracefully.
    throw error;
  }
}

/**
 * Closes the database connection pool gracefully
 */
async function closeDB() {
  if (pool) {
    try {
      await pool.end();
      console.log('Database connection pool closed successfully');
    } catch (error) {
      console.error('Error closing database connection pool:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDB();
  process.exit(0);
});

//module.exports = {query, connectDB}
export {query, connectDB, closeDB}