import { query } from '../../services/db.mjs';
import moment from 'moment';
import { MYSQL_DATETIME_FORMAT, proper } from '../../constants/index.js';

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
        
        const results = await query(queryStr, queryParams);       // <== query execution here

        
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
  },

  Mutation: {
    addOrUpdateLore: async (_parent, { input }, _context, _info) => {
      try {
        const { OBJECT_NAME, ...loreData } = input;
        
       // console.log('loreData:', loreData);
        // Build stored procedure call with parameters in the same order as the example
        const sqlStr = "CALL CreateLore(" +
          ((OBJECT_NAME) ? `'${OBJECT_NAME.replace("'","\\'")}'` : null) + "," +
          ((loreData.ITEM_TYPE) ? `'${loreData.ITEM_TYPE}'` : null) + "," +
          ((loreData.ITEM_IS) ? `'${loreData.ITEM_IS}'` : null) + "," +
          ((loreData.SUBMITTER) ? `'${loreData.SUBMITTER}'` : null) + "," +
          ((loreData.AFFECTS) ? `'${loreData.AFFECTS}'` : null) + "," +
          ((loreData.APPLY) ? loreData.APPLY : null) + "," +
          ((loreData.RESTRICTS) ? `'${loreData.RESTRICTS}'` : null) + "," +
          ((loreData.WEAP_CLASS) ? `'${loreData.WEAP_CLASS}'` : null) + "," +
          ((loreData.MAT_CLASS) ? `'${loreData.MAT_CLASS}'` : null) + "," +
          ((loreData.MATERIAL) ? `'${loreData.MATERIAL}'` : null) + "," +
          ((loreData.ITEM_VALUE) ? `'${loreData.ITEM_VALUE}'` : null) + "," +
          ((loreData.EXTRA) ? `'${loreData.EXTRA}'` : null) + "," +
          ((loreData.IMMUNE) ? `'${loreData.IMMUNE}'` : null) + "," +
          ((loreData.EFFECTS) ? `'${loreData.EFFECTS}'` : null) + "," +
          ((loreData.WEIGHT) ? loreData.WEIGHT : null) + "," +
          ((loreData.CAPACITY) ? loreData.CAPACITY : null) + "," +
          ((loreData.ITEM_LEVEL) ? `'${loreData.ITEM_LEVEL}'` : null) + "," +
          ((loreData.CONTAINER_SIZE) ? loreData.CONTAINER_SIZE : null) + "," +
          ((loreData.CHARGES) ? loreData.CHARGES : null) + "," +
          ((loreData.SPEED) ? loreData.SPEED : null) + "," +
          ((loreData.ACCURACY) ? loreData.ACCURACY : null) + "," +
          ((loreData.POWER) ? loreData.POWER : null) + "," +
          ((loreData.DAMAGE) ? `'${loreData.DAMAGE}'` : null) + ")";
          
        // Execute the stored procedure
        const result = await query(sqlStr, []);
        
        // log after execution of stored proc
        console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${loreData.SUBMITTER.padEnd(30)} insert/update '${OBJECT_NAME}'` );
        
        // Return the lore data (the stored procedure should return the created/updated lore)
        return { ...input, LORE_ID: result.insertId || result[0]?.LORE_ID };
        
      } catch (error) {
        console.error('Error in addOrUpdateLore:', error);
        throw new Error(`Failed to add or update lore with OBJECT_NAME: ${input.OBJECT_NAME}`);
      }
    },
  },
}; 