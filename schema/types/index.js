import gql from 'graphql-tag';
import { loreTypeDefs } from './lore.js';
import { personTypeDefs } from './person.js';
import { paginationTypeDefs } from './common.js';

// Base schema with empty Query and Mutation types
const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

// Combine all type definitions
export const typeDefs = [baseTypeDefs, paginationTypeDefs, loreTypeDefs, personTypeDefs]; 
