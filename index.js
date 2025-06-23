"use strict";
//https://www.apollographql.com/docs/apollo-server/getting-started#step-5-define-a-resolver

//require('dotenv').config(); // Load environment variables from .env
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
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
        // Return the error to the client (you might want to hide sensitive details in production)
        return error;
      },
    });

    // Start the server
    //const { url } = await server.listen({ port: process.env.PORT || 4000 });
    //console.log(`🚀 Server ready at ${url}`);
    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },
    });
    console.log(`🚀  Server ready at: ${url}`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with an error code
  }
}

// Call the function to start the server
startServer();
