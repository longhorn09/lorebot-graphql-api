import { query } from '../../services/db.mjs';
import moment from 'moment';
import { MYSQL_DATETIME_FORMAT, proper } from '../../constants/index.js';

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

// Helper function to escape single quotes in strings
const escapeString = (str) => {
  if (!str) return null;
  return str.replace(/'/g, "\\'");
};

export const personResolvers = {
  Query: {
    // Cursor-based pagination (GraphQL standard)
    allPersonsConnection: async (_parent, { first = 10, after, filter }, _context, _info) => {
      try {
        const { whereClause, params } = buildWhereClause(filter);
        //console.log('filter:', filter);
        if (filter != null) {   // falsy - ie. undefined or null, don't do !==, too stringest with undefined possible value
          console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${'Submitter TBD'.padEnd(30)} !who ${proper(filter.CHARNAME)}`);
        }
        else {
          console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${'Submitter TBD'.padEnd(30)} !whoall`);
        }
        //console.log('_info:', _context);
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
          conditions.push('PERSON_ID > ?');
          queryParams.push(afterValue);
        }
        
        // Combine all conditions
        if (conditions.length > 0) {
          queryStr += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Add ordering (default to PERSON_ID ASC)
        //queryStr += ` ORDER BY CREATE_DATE DESC`;   // paging issues
        queryStr += ` ORDER BY PERSON_ID ASC`;  
        
        // Use string interpolation for LIMIT since we control the value
        const limit = first + 1; // Get one extra to check if there's a next page
        queryStr += ` LIMIT ${limit}`;
        
        const results = await query(queryStr, queryParams);
        const hasNextPage = results.length > first;
        const items = hasNextPage ? results.slice(0, first) : results;
        
        const edges = items.map(item => ({
          node: item,
          cursor: createCursor(item.PERSON_ID)
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
    addOrUpdatePerson: async (_parent, { input }, _context, _info) => {
      try {
        //console.log('Processing person:', input.CHARNAME);
        
        // Inspect context and info parameters
        /*
        console.log('=== PERSON RESOLVER DEBUG ===');
        console.log('_context:', JSON.stringify(_context, null, 2));
        console.log('_info keys:', Object.keys(_info));
        console.log('_info.fieldName:', _info.fieldName);
        console.log('_info.operation:', _info.operation);
        console.log('_info.returnType:', _info.returnType);
        console.log('_info.parentType:', _info.parentType);
        console.log('_info.variableValues:', _info.variableValues);
        console.log('_info.path:', _info.path);
        console.log('_info.fieldNodes:', _info.fieldNodes);
        console.log('===========================');
        */
        
        // Build stored procedure call with parameters in the same order as Person type definition
        // need to add ONCHEST to the backend stored procedure and table
        //  ((input.CREATE_DATE) ? `'${escapeString(input.CREATE_DATE)}'` : null) + "," +
        const sqlStr = "CALL CreatePerson(" +
          ((input.CHARNAME) ? `'${escapeString(input.CHARNAME)}'` : null) + "," +
          ((input.LIGHT) ? `'${escapeString(input.LIGHT)}'` : null) + "," +
          ((input.RING1) ? `'${escapeString(input.RING1)}'` : null) + "," +
          ((input.RING2) ? `'${escapeString(input.RING2)}'` : null) + "," +
          ((input.NECK1) ? `'${escapeString(input.NECK1)}'` : null) + "," +
          ((input.NECK2) ? `'${escapeString(input.NECK2)}'` : null) + "," +
          ((input.BODY) ? `'${escapeString(input.BODY)}'` : null) + "," +
          //((input.ONCHEST) ? `'${escapeString(input.ONCHEST)}'` : null) + "," +
          ((input.HEAD) ? `'${escapeString(input.HEAD)}'` : null) + "," +
          ((input.LEGS) ? `'${escapeString(input.LEGS)}'` : null) + "," +
          ((input.FEET) ? `'${escapeString(input.FEET)}'` : null) + "," +
          ((input.ARMS) ? `'${escapeString(input.ARMS)}'` : null) + "," +
          ((input.SLUNG) ? `'${escapeString(input.SLUNG)}'` : null) + "," +
          ((input.HANDS) ? `'${escapeString(input.HANDS)}'` : null) + "," +
          ((input.SHIELD) ? `'${escapeString(input.SHIELD)}'` : null) + "," +
          ((input.ABOUT) ? `'${escapeString(input.ABOUT)}'` : null) + "," +
          ((input.WAIST) ? `'${escapeString(input.WAIST)}'` : null) + "," +
          ((input.POUCH) ? `'${escapeString(input.POUCH)}'` : null) + "," +
          ((input.RWRIST) ? `'${escapeString(input.RWRIST)}'` : null) + "," +
          ((input.LWRIST) ? `'${escapeString(input.LWRIST)}'` : null) + "," +
          ((input.PRIMARY_WEAP) ? `'${escapeString(input.PRIMARY_WEAP)}'` : null) + "," +
          ((input.SECONDARY_WEAP) ? `'${escapeString(input.SECONDARY_WEAP)}'` : null) + "," +
          ((input.HELD) ? `'${escapeString(input.HELD)}'` : null) + "," +
          ((input.BOTH_HANDS) ? `'${escapeString(input.BOTH_HANDS)}'` : null) + "," +
          ((input.SUBMITTER) ? `'${escapeString(input.SUBMITTER)}'` : null) + "," +        
          ((input.CLAN_ID) ? input.CLAN_ID : null) +
          ")";
        
        //console.log('Executing stored procedure:', sqlStr);
        
        // Execute the stored procedure
        const result = await query(sqlStr, []);
        console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${input.SUBMITTER.padEnd(30)} !who ${input.CHARNAME}`);
        
        // Return the person data (the stored procedure should return the created/updated person)
        return { ...input, PERSON_ID: result.insertId || result[0]?.PERSON_ID };
        
      } catch (error) {
        console.error('Error in addOrUpdatePerson:', error);
        throw new Error(`Failed to add or update person with CHARNAME: ${input.CHARNAME}`);
      }
    },

  },
}; 