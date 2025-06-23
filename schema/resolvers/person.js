import { query } from '../../services/db.mjs';

export const personResolvers = {
  Query: {
    allPersons: async (_parent, _args, context, _info) => {
      try {
        const results = await query('SELECT * FROM Person', []);
        return results;
      } catch (error) {
        console.error('Error fetching all persons:', error);
        throw new Error('Failed to fetch person data');
      }
    },

    person: async (_parent, args, _context, _info) => {
      try {
        const { PERSON_ID } = args;
        const results = await query('SELECT * FROM Person WHERE PERSON_ID = ?', [PERSON_ID]);
        return results.length > 0 ? results[0] : null;
      } catch (error) {
        console.error('Error fetching person by ID:', error);
        throw new Error('Failed to fetch person data');
      }
    },
  },

  Mutation: {
    addPerson: async (_parent, { input }, _context, _info) => {
      try {
        // Implementation for adding person
        console.log('Adding person:', input);
        // Add your INSERT query here
        return input;
      } catch (error) {
        console.error('Error adding person:', error);
        throw new Error('Failed to add person');
      }
    },

    updatePerson: async (_parent, { PERSON_ID, input }, _context, _info) => {
      try {
        // Implementation for updating person
        console.log('Updating person:', PERSON_ID, input);
        // Add your UPDATE query here
        return { PERSON_ID, ...input };
      } catch (error) {
        console.error('Error updating person:', error);
        throw new Error('Failed to update person');
      }
    },

    deletePerson: async (_parent, { PERSON_ID }, _context, _info) => {
      try {
        // Implementation for deleting person
        console.log('Deleting person:', PERSON_ID);
        // Add your DELETE query here
        return { PERSON_ID };
      } catch (error) {
        console.error('Error deleting person:', error);
        throw new Error('Failed to delete person');
      }
    },
  },
}; 