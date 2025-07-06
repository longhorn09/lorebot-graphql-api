"use strict";
//https://www.apollographql.com/docs/apollo-server/getting-started#step-5-define-a-resolver

//require('dotenv').config(); // Load environment variables from .env
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloHandler } from '@as-integrations/fastify';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { typeDefs, resolvers } from './schema/index.js'; // Import from new modular schema
import { query, connectDB } from './services/db.mjs';
dotenv.config();

async function startServer() {
  try {
    // Connect to the database
    const dbConnection = await connectDB();
    console.log('Successfully connected to Cloud SQL (MySQL)!');

    // Create Fastify app
    const app = fastify({
      logger: {
        level: 'error',  // Only log errors, not info/warn
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        }
      }
    });
    
    // Register CORS plugin
    await app.register(cors, {
      origin: true, // Configure according to your needs
      credentials: true
    });

    // Health check endpoint
    app.get('/health', async (request, reply) => {
      console.log('🏥 Health check request received');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'lorebot-graphql-api',
        database: 'connected'
      };
    });

    // Create a new ApolloServer instance
    const server = new ApolloServer({
      typeDefs,
      resolvers,
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

    // Start the Apollo server
    await server.start();
    
    // Register GraphQL route with Fastify
    app.route({
      url: '/graphql',
      method: ['GET', 'POST'],
      handler: fastifyApolloHandler(server, {
        context: async (request, reply) => {
          // Log incoming requests for debugging
          const userAgent = request.headers['user-agent'] || 'Unknown';
          const ip = request.headers['x-forwarded-for'] || request.ip || 'Unknown';
          const contentType = request.headers['content-type'] || 'Unknown';
          const contentLength = request.headers['content-length'] || 'Unknown';
          
          // Check if detailed logging is enabled
          const enableDetailedLogging = process.env.ENABLE_DETAILED_LOGGING === 'true';
          
          // Filter out common polling requests
          const isPollingRequest = 
            request.method === 'POST' && 
            (!request.body || !request.body.query || request.body.query.trim() === '') &&
            userAgent.includes('Mozilla') && 
            ip === '::1';
          
          if (enableDetailedLogging && !isPollingRequest) {
            console.log(`📥 ${request.method} ${request.url} - ${new Date().toISOString()}`);
            console.log(`   User-Agent: ${userAgent}`);
            console.log(`   IP: ${ip}`);
            console.log(`   Content-Type: ${contentType}`);
            console.log(`   Content-Length: ${contentLength}`);
            
            // Log request body for debugging (be careful with sensitive data)
            if (request.body && Object.keys(request.body).length > 0) {
              console.log(`   Request Body: ${JSON.stringify(request.body).substring(0, 200)}...`);
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
      }),
    });

    // Start Fastify server
    const port = process.env.PORT || 4000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    console.log(`🚀  Server ready at: http://localhost:${port}/`);
    console.log(`🏥  Health check available at: http://localhost:${port}/health`);
    console.log(`📊  Apollo Studio available at: http://localhost:${port}/graphql`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with an error code
  }
}

// Call the function to start the server
startServer();
