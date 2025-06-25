import { query } from '../../services/db.mjs';

// Helper function to create cursor from ID
const createCursor = (value) => {
  // Handle different data types
  if (value === null || value === undefined) {
    return Buffer.from('null').toString('base64');
  }
  return Buffer.from(value.toString()).toString('base64');
};

// Helper function to decode cursor to ID
const decodeCursor = (cursor) => {
  const decoded = Buffer.from(cursor, 'base64').toString();
  if (decoded === 'null') {
    return null;
  }
  // Try to parse as integer first, fallback to string
  const parsed = parseInt(decoded);
  return isNaN(parsed) ? decoded : parsed;
};

// Helper function to build WHERE clause from filters
const buildWhereClause = (filters) => {
  if (!filters) {
    return {
      whereClause: '',
      params: []
    };
  }
  
  const conditions = [];
  const params = [];
  
  if (filters.CHARNAME) {
    conditions.push('CHARNAME LIKE ?');
    params.push(`%${filters.CHARNAME}%`);
  }
  
  if (filters.SUBMITTER) {
    conditions.push('SUBMITTER LIKE ?');
    params.push(`%${filters.SUBMITTER}%`);
  }
  
  if (filters.CLAN_ID) {
    conditions.push('CLAN_ID = ?');
    params.push(filters.CLAN_ID);
  }
  
  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

// Helper function to validate orderBy field
const validateOrderBy = (orderBy) => {
  const validFields = ['PERSON_ID', 'CHARNAME', 'SUBMITTER', 'CREATE_DATE', 'CLAN_ID'];
  if (!validFields.includes(orderBy)) {
    throw new Error(`Invalid orderBy field: ${orderBy}`);
  }
  return orderBy;
};

export const personResolvers = {
  Query: {
    // Cursor-based pagination (GraphQL standard)
    allPersonsConnection: async (_parent, { first = 10, after, filter, orderBy = 'PERSON_ID', orderDirection = 'ASC' }, _context, _info) => {
      try {
        // Validate orderBy field
        const validatedOrderBy = validateOrderBy(orderBy);
        
        const { whereClause, params } = buildWhereClause(filter);
        
        // Get total count
        const countResult = await query(`SELECT COUNT(*) as total FROM Person ${whereClause}`, params);
        const totalCount = countResult[0].total;
        
        // Build query with cursor pagination
        let queryStr = `SELECT * FROM Person`;
        let queryParams = [...params];
        
        // Build WHERE conditions
        const conditions = [];
        
        // Add filter conditions
        if (whereClause) {
          // Remove "WHERE " prefix and add conditions
          const filterConditions = whereClause.replace('WHERE ', '');
          if (filterConditions) {
            conditions.push(filterConditions);
          }
        }
        
        // Add cursor condition
        if (after) {
          const afterValue = decodeCursor(after);
          const operator = orderDirection === 'ASC' ? '>' : '<';
          conditions.push(`${validatedOrderBy} ${operator} ?`);
          queryParams.push(afterValue);
        }
        
        // Combine all conditions
        if (conditions.length > 0) {
          queryStr += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Add ordering
        queryStr += ` ORDER BY ${validatedOrderBy} ${orderDirection}`;
        
        // Use string interpolation for LIMIT since we control the value
        const limit = first + 1; // Get one extra to check if there's a next page
        queryStr += ` LIMIT ${limit}`;
        
        const results = await query(queryStr, queryParams);
        const hasNextPage = results.length > first;
        const items = hasNextPage ? results.slice(0, first) : results;
        
        const edges = items.map(item => ({
          node: item,
          cursor: createCursor(item[validatedOrderBy])
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
        console.error('Error fetching paginated persons:', error);
        throw new Error('Failed to fetch person data');
      }
    },

    // Legacy query (keep for backward compatibility)
    allPersons: async (_parent, _args, context, _info) => {
      try {
        const results = await query('SELECT * FROM Person', []);
        return results;
      } catch (error) {
        console.error('Error fetching all persons:', error);
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