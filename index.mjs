"use strict";
//https://www.apollographql.com/docs/apollo-server/getting-started#step-5-define-a-resolver

//require('dotenv').config(); // Load environment variables from .env
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { typeDefs, resolvers } from './schema/index.js'; // Import from new modular schema
import { query, connectDB } from './services/db.mjs';
dotenv.config();

async function startServer() {
  try {
    // Connect to the database
    const dbConnection = await connectDB();
    console.log('Successfully connected to Cloud SQL (MySQL)!');

    // Create Express app
    const app = express();
    
    // Add CORS middleware
    app.use(cors());
    
    // Add JSON body parser
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      console.log('🏥 Health check request received');
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'lorebot-graphql-api',
        database: 'connected'
      });
    });

    // Create a new ApolloServer instance
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ db: dbConnection }), // Pass the database connection to resolvers
      // Environment-based configuration
      introspection: process.env.NODE_ENV !== 'production', // Enable in development, disable in production
      playground: process.env.NODE_ENV !== 'production',    // Enable in development, disable in production
      csrfPrevention: process.env.NODE_ENV === 'production', // Enable in production, disable in development
      formatError: (error) => {
        // Log the error for debugging purposes (optional)
        console.error('GraphQL Error:', error);
        
        // Add more detailed logging for debugging empty query requests
        if (error.extensions?.code === 'BAD_REQUEST' && 
            error.message.includes('non-empty `query`')) {
          console.log('⚠️  Empty query request detected - this might be a health check or monitoring tool');
          console.log('   Request details:', {
            path: error.extensions?.path,
            timestamp: new Date().toISOString(),
            userAgent: error.extensions?.userAgent || 'Unknown',
            ip: error.extensions?.ip || 'Unknown'
          });
          
          // Don't log this as an error since it's likely expected behavior
          return {
            message: 'GraphQL query is required',
            extensions: {
              code: 'BAD_REQUEST'
            }
          };
        }
        
        // Return the error to the client (you might want to hide sensitive details in production)
        return error;
      },
    });

    // Start the server
    await server.start();
    
    // Apply Apollo middleware to Express app
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => {
        // Log incoming requests for debugging
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const contentType = req.headers['content-type'] || 'Unknown';
        const contentLength = req.headers['content-length'] || 'Unknown';
        
        // Check if detailed logging is enabled
        const enableDetailedLogging = process.env.ENABLE_DETAILED_LOGGING === 'true';
        
        // Filter out common polling requests
        const isPollingRequest = 
          req.method === 'POST' && 
          (!req.body || !req.body.query || req.body.query.trim() === '') &&
          userAgent.includes('Mozilla') && 
          ip === '::1';
        
        if (enableDetailedLogging && !isPollingRequest) {
          console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
          console.log(`   User-Agent: ${userAgent}`);
          console.log(`   IP: ${ip}`);
          console.log(`   Content-Type: ${contentType}`);
          console.log(`   Content-Length: ${contentLength}`);
          
          // Log request body for debugging (be careful with sensitive data)
          if (req.body && Object.keys(req.body).length > 0) {
            console.log(`   Request Body: ${JSON.stringify(req.body).substring(0, 200)}...`);
          }
        } else if (isPollingRequest && enableDetailedLogging) {
          console.log(`🔄 Polling request detected (filtered) - ${new Date().toISOString()}`);
        }
        
        return { 
          db: dbConnection,
          userAgent,
          ip
        };
      },
    }));

    // Start Express server
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`🚀  Server ready at: http://localhost:${port}/`);
      console.log(`🏥  Health check available at: http://localhost:${port}/health`);
      console.log(`📊  Apollo Studio available at: http://localhost:${port}/graphql`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with an error code
  }
}

// Call the function to start the server
startServer();
