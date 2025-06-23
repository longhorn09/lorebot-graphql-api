"use strict";
//https://www.apollographql.com/docs/apollo-server/getting-started#step-5-define-a-resolver

//require('dotenv').config(); // Load environment variables from .env
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import typeDefs from './schema.mjs'; // Import typeDefs from the new schema.js file
import { query, connectDB } from './services/db.mjs';
dotenv.config();


// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    allLore: async (_parent, _args, context, _info) => {
      try {
        // Use the query function to execute SQL against the database
        const results = await query('SELECT * FROM Lore', []);
        return results;
      } catch (error) {
        console.error('Error fetching all lore:', error);
        throw new Error('Failed to fetch lore data');
      }
    },

    lore: async (_parent, args, _context, _info) => {
      try {
        // Destructure LORE_ID from the args object
        const { LORE_ID } = args;

        // Use parameterized query to prevent SQL injection
        const results = await query('SELECT * FROM Lore WHERE LORE_ID = ?', [LORE_ID]);
        
        // Return the first result (should be unique since LORE_ID is likely a primary key)
        return results.length > 0 ? results[0] : null;
      } catch (error) {
        console.error('Error fetching lore by ID:', error);
        throw new Error('Failed to fetch lore data');
      }
    },
  },
};


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
    // typeDefs: Your GraphQL schema definitions
    // resolvers: Functions that resolve data for your schema fields
    // context: An object passed to all resolvers, useful for sharing database connections
    //          or authentication info.
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ db: dbConnection }), // Pass the database connection to resolvers
      // Enable Apollo Studio (formerly GraphQL Playground) in development for easy testing
      introspection: true,
      playground: true,
      csrfPrevention: false, // <-- ONLY FOR DEVELOPMENT, DO NOT USE IN PRODUCTION
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
        
        console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
        console.log(`   User-Agent: ${userAgent}`);
        console.log(`   IP: ${ip}`);
        
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
