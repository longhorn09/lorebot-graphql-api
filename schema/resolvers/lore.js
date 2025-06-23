import { query } from '../../services/db.mjs';

// Helper function to create cursor from ID
const createCursor = (id) => Buffer.from(id.toString()).toString('base64');

// Helper function to decode cursor to ID
const decodeCursor = (cursor) => parseInt(Buffer.from(cursor, 'base64').toString());

// Helper function to build WHERE clause from filters
const buildWhereClause = (filters) => {
  if (!filters) return '';
  
  const conditions = [];
  const params = [];
  
  if (filters.OBJECT_NAME) {
    conditions.push('OBJECT_NAME LIKE ?');
    params.push(`%${filters.OBJECT_NAME}%`);
  }
  
  if (filters.ITEM_TYPE) {
    conditions.push('ITEM_TYPE = ?');
    params.push(filters.ITEM_TYPE);
  }
  
  if (filters.CLASS) {
    conditions.push('CLASS = ?');
    params.push(filters.CLASS);
  }
  
  if (filters.SUBMITTER) {
    conditions.push('SUBMITTER LIKE ?');
    params.push(`%${filters.SUBMITTER}%`);
  }
  
  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

export const loreResolvers = {
  Query: {
    // Cursor-based pagination (GraphQL standard)
    allLoreConnection: async (_parent, { first = 10, after, filter }, _context, _info) => {
      try {
        const { whereClause, params } = buildWhereClause(filter);
        
        // Get total count
        const countResult = await query(`SELECT COUNT(*) as total FROM Lore ${whereClause}`, params);
        const totalCount = countResult[0].total;
        
        // Build query with cursor pagination
        let queryStr = `SELECT * FROM Lore ${whereClause}`;
        let queryParams = [...params];
        
        if (after) {
          const afterId = decodeCursor(after);
          queryStr += ` AND LORE_ID > ?`;
          queryParams.push(afterId);
        }
        
        queryStr += ` ORDER BY LORE_ID ASC LIMIT ?`;
        queryParams.push(first + 1); // Get one extra to check if there's a next page
        
        const results = await query(queryStr, queryParams);
        const hasNextPage = results.length > first;
        const items = hasNextPage ? results.slice(0, first) : results;
        
        const edges = items.map(item => ({
          node: item,
          cursor: createCursor(item.LORE_ID)
        }));
        
        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: !!after,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
          },
          totalCount
        };
      } catch (error) {
        console.error('Error fetching paginated lore:', error);
        throw new Error('Failed to fetch lore data');
      }
    },

    // Legacy query (keep for backward compatibility)
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