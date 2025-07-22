import { loreResolvers } from './lore.js';
import { personResolvers } from './person.js';
import { recentResolvers } from './recent.js';

// Merge all resolvers
export const resolvers = {
  Query: {
    ...loreResolvers.Query,
    ...personResolvers.Query,
    ...recentResolvers.Query,
  },
  Mutation: {
    ...loreResolvers.Mutation,
    ...personResolvers.Mutation,
  },
  Person: {
    ...personResolvers.Person,
  },
}; 