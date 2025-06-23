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
  //const connection = await mysql.createConnection(config.db);
  const connection = await mysql.createConnection(
  {
    /* don't expose password or any sensitive info, done only for demo */
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [results, ] = await connection.execute(sql, params);

  return results;
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
      host: process.env.DB_HOST , // e.g., '127.0.0.1' for local or public IP/private IP for Cloud SQL
      user: process.env.DB_USER ,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ,
      waitForConnections: true, // If true, the pool will queue connections if none are available
      connectionLimit: 5,      // Max number of connections to create at once
      queueLimit: 0,            // Unlimited queueing of connections
      // Optional: For Cloud SQL connection string or Unix socket
      // socketPath: process.env.DB_SOCKET_PATH || '/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME',
      // You might need to configure SSL/TLS for secure connections in production
      // ssl: {
      //   rejectUnauthorized: false // Set to true and provide CAs for production
      // }
    });
    return pool;
  } catch (error) {
    console.error('❌ Database connection pool failed:', error);
    // In a real application, you might want to retry or handle this more gracefully.
    throw error;
  }
}

//module.exports = {query, connectDB}
export {query, connectDB}