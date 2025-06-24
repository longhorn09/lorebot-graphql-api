import { query } from '../../services/db.mjs';


// Helper function to create cursor from ID
const createCursor = (id) => Buffer.from(id.toString()).toString('base64');

// Helper function to decode cursor to ID
const decodeCursor = (cursor) => parseInt(Buffer.from(cursor, 'base64').toString());

// Helper function to expand SQL query with parameters for debugging
const expandSqlQuery = (sql, params) => {
  let expandedSql = sql;
  params.forEach((param, index) => {
    const placeholder = '?';
    const value = typeof param === 'string' ? `'${param}'` : param;
    expandedSql = expandedSql.replace(placeholder, value);
  });
  return expandedSql;
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
    /**
     * Paginated search with tokenization - combines searchToken with cursor-based pagination
     * @param {*} _parent 
     * @param {*} param1 
     * @param {*} context 
     * @param {*} _info 
     * @returns 
     */
    allLorePaginated: async (_parent, { first = 10, after, searchToken }, context, _info) => {
      try {
        // Extract requested fields from GraphQL query
        const requestedFields = _info.fieldNodes[0].selectionSet.selections
          .find(selection => selection.name.value === 'edges')
          ?.selectionSet?.selections
          ?.find(selection => selection.name.value === 'node')
          ?.selectionSet?.selections?.map(selection => selection.name.value) || [];
        
        // Build dynamic SELECT statement
        const selectFields = requestedFields.length > 0 ? requestedFields.join(', ') : '*';
        let queryStr = `SELECT ${selectFields} FROM Lore`;
        let queryParams = [];
        
        // Build WHERE conditions
        const conditions = [];
        
        // Add search token conditions
        if (searchToken) {
          // Tokenize the search string using period as delimiter
          const tokens = searchToken
            .toLowerCase()
            .split('.')
            .filter(token => token.length > 0);
          
          if (tokens.length > 0) {
            const tokenConditions = [];
            
            // Search across multiple fields with tokenization
            tokens.forEach(token => {
              const fieldConditions = [
                'OBJECT_NAME LIKE ?'
                /*,
                'LOWER(ITEM_TYPE) LIKE ?',
                'LOWER(ITEM_IS) LIKE ?',
                'LOWER(SUBMITTER) LIKE ?',
                'LOWER(AFFECTS) LIKE ?',
                'LOWER(RESTRICTS) LIKE ?',
                'LOWER(CLASS) LIKE ?',
                'LOWER(MAT_CLASS) LIKE ?',
                'LOWER(MATERIAL) LIKE ?',
                'LOWER(ITEM_VALUE) LIKE ?',
                'LOWER(EXTRA) LIKE ?',
                'LOWER(IMMUNE) LIKE ?',
                'LOWER(EFFECTS) LIKE ?',
                'LOWER(ITEM_LEVEL) LIKE ?',
                'LOWER(DAMAGE) LIKE ?'*/
              ];
              
              // Add the token parameter for each field
              fieldConditions.forEach(() => {
                queryParams.push(`%${token}%`);
              });
              
              // Group conditions for this token with AND
              tokenConditions.push(`(${fieldConditions.join(' AND ')})`);
            });
            
            // Combine all token conditions with AND
            conditions.push(`(${tokenConditions.join(' AND ')})`);
          }
        }
        
        // Add cursor condition for pagination
        if (after) {
          const afterId = decodeCursor(after);
          conditions.push('LORE_ID > ?');
          queryParams.push(afterId);
        }
        
        // Combine all conditions
        if (conditions.length > 0) {
          queryStr += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Get total count for the search (without pagination)
        const searchConditions = [];
        const searchParams = [];
        
        // Rebuild search conditions for count query (excluding pagination)
        if (searchToken) {
          const tokens = searchToken
            .toLowerCase()
            .split('.')
            .filter(token => token.length > 0);
          
          if (tokens.length > 0) {
            const tokenConditions = [];
            
            tokens.forEach(token => {
              const fieldConditions = [
                'OBJECT_NAME LIKE ?'
              ];
              
              fieldConditions.forEach(() => {
                searchParams.push(`%${token}%`);
              });
              
              tokenConditions.push(`(${fieldConditions.join(' AND ')})`);
            });
            
            searchConditions.push(`(${tokenConditions.join(' AND ')})`);
          }
        }
        
        const countQueryStr = searchConditions.length > 0 
          ? `SELECT COUNT(*) as total FROM Lore WHERE ${searchConditions.join(' AND ')}`
          : 'SELECT COUNT(*) as total FROM Lore';
        const countResult = await query(countQueryStr, searchParams);
        const totalCount = countResult[0].total;
        
        // Add ordering and limit
        const limit = first + 1; // Get one extra to check if there's a next page
        queryStr += ` ORDER BY LORE_ID ASC LIMIT ${limit}`;
        
        // Log the full expanded SQL query for debugging
        //console.log('lore.allLorePaginated:', expandSqlQuery(queryStr, queryParams));
        
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
        console.error('Error fetching paginated lore with search:', error);
        throw new Error('Failed to fetch paginated lore data');
      }
    },

    /**
     * This code will satisfy the /stat slash command in discord
     * It will require further tokenization of the searchToken to develop the query
     * and assume that the delimiter is a period
     * @param {*} _parent 
     * @param {*} param1 
     * @param {*} context 
     * @param {*} _info 
     * @returns 
     */
    allLore: async (_parent, { searchToken }, context, _info) => {
      try {
        // Extract requested fields from GraphQL query
        const requestedFields = _info.fieldNodes[0].selectionSet.selections.map(
          selection => selection.name.value
        );
        
        // Build dynamic SELECT statement
        const selectFields = requestedFields.length > 0 ? requestedFields.join(', ') : '*';
        let queryStr = `SELECT ${selectFields} FROM Lore`;
        let queryParams = [];
        
        //console.log("requested fields: " + requestedFields.join(', '));
        
        if (searchToken != null) {
          // Tokenize the search string using period as delimiter
          const tokens = searchToken
            .toLowerCase()
            .split('.')
            .filter(token => token.length > 0);
          
          if (tokens.length > 0) {
            const conditions = [];
            
            // Search across multiple fields with tokenization
            tokens.forEach(token => {
              const tokenConditions = [
                'Lore.OBJECT_NAME LIKE ?'
              ];
              
              // Add the token parameter for each field
              tokenConditions.forEach(() => {
                queryParams.push(`%${token}%`);
              });
              
              // Group conditions for this token with AND
              conditions.push(`(${tokenConditions.join(' AND ')})`);
            });
            
            // Combine all token conditions with AND
            queryStr += ` WHERE ${conditions.join(' AND ')}`;
          }
        }
        
        // Log the full expanded SQL query for debugging
        console.log('Full SQL Query:', expandSqlQuery(queryStr, queryParams));
        
        const results = await query(queryStr, queryParams);
        return results;
      } catch (error) {
        console.error('Error fetching all lore:', error);
        throw new Error('Failed to fetch lore data');
      }
    },

    lore: async (_parent, args, _context, _info) => {
      try {
        const { LORE_ID } = args;
        const queryStr = 'SELECT * FROM Lore WHERE LORE_ID = ?';
        const queryParams = [LORE_ID];
        
        // Log the full expanded SQL query for debugging
        console.log('Full SQL Query:', expandSqlQuery(queryStr, queryParams));
        
        const results = await query(queryStr, queryParams);
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