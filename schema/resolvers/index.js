import { loreResolvers } from './lore.js';
import { personResolvers } from './person.js';

// Merge all resolvers
export const resolvers = {
  Query: {
    ...loreResolvers.Query,
    ...personResolvers.Query,
  },
  Mutation: {
    ...loreResolvers.Mutation,
    ...personResolvers.Mutation,
  },
}; 