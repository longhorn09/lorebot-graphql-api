import { query } from '../../services/db.mjs';

export const loreResolvers = {
  Query: {
    allLore: async (_parent, _args, context, _info) => {
      try {
        const results = await query('SELECT * FROM Lore', []);
        return results;
      } catch (error) {
        console.error('Error fetching all lore:', error);
        throw new Error('Failed to fetch lore data');
      }
    },

    lore: async (_parent, args, _context, _info) => {
      try {
        const { LORE_ID } = args;
        const results = await query('SELECT * FROM Lore WHERE LORE_ID = ?', [LORE_ID]);
        return results.length > 0 ? results[0] : null;
      } catch (error) {
        console.error('Error fetching lore by ID:', error);
        throw new Error('Failed to fetch lore data');
      }
    },
  },

  Mutation: {
    addLore: async (_parent, { input }, _context, _info) => {
      try {
        // Implementation for adding lore
        console.log('Adding lore:', input);
        // Add your INSERT query here
        return input;
      } catch (error) {
        console.error('Error adding lore:', error);
        throw new Error('Failed to add lore');
      }
    },

    updateLore: async (_parent, { LORE_ID, input }, _context, _info) => {
      try {
        // Implementation for updating lore
        console.log('Updating lore:', LORE_ID, input);
        // Add your UPDATE query here
        return { LORE_ID, ...input };
      } catch (error) {
        console.error('Error updating lore:', error);
        throw new Error('Failed to update lore');
      }
    },

    deleteLore: async (_parent, { LORE_ID }, _context, _info) => {
      try {
        // Implementation for deleting lore
        console.log('Deleting lore:', LORE_ID);
        // Add your DELETE query here
        return { LORE_ID };
      } catch (error) {
        console.error('Error deleting lore:', error);
        throw new Error('Failed to delete lore');
      }
    },
  },
}; 