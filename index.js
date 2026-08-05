"use strict";
//https://www.apollographql.com/docs/apollo-server/getting-started#step-5-define-a-resolver

//require('dotenv').config(); // Load environment variables from .env
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';
import { fastifyApolloHandler } from '@as-integrations/fastify';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { typeDefs, resolvers } from './schema/index.js'; // Import from new modular schema
import { query, connectDB, closeDB } from './services/db.mjs';
dotenv.config({ quiet: true });

/**
 * Dev landing page: redirect to Apollo Studio Sandbox.
 * The embedded Sandbox iframe often renders blank when the browser blocks
 * Apollo CDN scripts / third-party frames; Studio is the reliable UI.
 */
function apolloStudioLandingPagePlugin(endpointUrl) {
  const studioUrl = `https://studio.apollographql.com/sandbox/explorer?endpoint=${encodeURIComponent(endpointUrl)}`;
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lorebot GraphQL → Apollo Sandbox</title>
    <meta http-equiv="refresh" content="0; url=${studioUrl}" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
      a { color: #3f20ba; }
    </style>
  </head>
  <body>
    <h1>Opening Apollo Sandbox…</h1>
    <p>If you are not redirected, <a href="${studioUrl}">open Apollo Sandbox</a>.</p>
    <p>GraphQL endpoint: <code>${endpointUrl}</code></p>
  </body>
</html>`;

  return {
    async serverWillStart() {
      return {
        async renderLandingPage() {
          return { html };
        },
      };
    },
  };
}

async function startServer() {
  try {
    // Connect to Neon Postgres
    const dbConnection = await connectDB();
    console.log('Successfully connected to Neon Postgres!');
    
    // Test the connection
    try {
      await query('SELECT 1 as test');
      console.log('Database connection test successful');
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Create Fastify app
    // Cloud Run expects JSON logs; pino-pretty is for local development only.
    const app = fastify({
      trustProxy: true,
      logger: isProduction
        ? { level: process.env.LOG_LEVEL || 'info' }
        : {
            level: process.env.LOG_LEVEL || 'error',
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          },
    });
    
    // Register CORS plugin
    await app.register(cors, {
      origin: true, // Configure according to your needs
      credentials: true
    });

    // Liveness for Cloud Run / load balancers (no DB hit)
    app.get('/health', async () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'lorebot-graphql-api',
    }));

    // Optional readiness probe that verifies the pool can serve a query
    app.get('/ready', async (_request, reply) => {
      try {
        await query('SELECT 1 as test');
        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          database: 'connected',
        };
      } catch (error) {
        reply.code(503);
        return {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          database: 'unavailable',
          error: error.message,
        };
      }
    });

    const port = Number(process.env.PORT || 4000);
    const host = process.env.HOST || '0.0.0.0';
    // Studio needs an absolute URL; local browser testing uses localhost.
    const graphqlEndpoint =
      process.env.GRAPHQL_PUBLIC_URL || `http://localhost:${port}/graphql`;

    // Create a new ApolloServer instance
    // Note: Apollo Server 4+/5 ignore the old `playground` option; use landing page plugins.
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: !isProduction,
      csrfPrevention: isProduction,
      plugins: [
        isProduction
          ? ApolloServerPluginLandingPageProductionDefault()
          : apolloStudioLandingPagePlugin(graphqlEndpoint),
      ],
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
      method: ['GET', 'POST', 'OPTIONS'],
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
            query, // Make the query function available in context
            userAgent,
            ip
          };
        },
      }),
    });

    // Start Fastify server
    await app.listen({ port, host });
    console.log(`🚀  Server ready at: http://localhost:${port}/`);
    console.log(`🏥  Health check available at: http://localhost:${port}/health`);
    console.log(`📊  Apollo Studio available at: http://localhost:${port}/graphql`);
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      try {
        await app.close();
        await closeDB();
        console.log('Server and database connections closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with an error code
  }
}

// Call the function to start the server
startServer();
