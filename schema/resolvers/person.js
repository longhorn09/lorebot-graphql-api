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
    // Exact match, case-insensitive (MySQL CI collation parity)
    conditions.push('LOWER(CHARNAME) = LOWER(?)');
    params.push(filters.CHARNAME);
  }
  
  if (filters.SUBMITTER) {
    conditions.push('LOWER(SUBMITTER) = LOWER(?)');
    params.push(filters.SUBMITTER);
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

export const personResolvers = {
  Person: {
    // Field resolver to map ON_CHEST database column to ONCHEST GraphQL field
    ONCHEST: (parent) => {
      /*
      console.log('🔍 ONCHEST field resolver called');
      console.log('🔍 Parent object keys:', Object.keys(parent));
      console.log('🔍 Parent.ON_CHEST value:', parent.ON_CHEST);
      console.log('🔍 Parent.ONCHEST value:', parent.ONCHEST);
      console.log('🔍 Parent object full:', JSON.stringify(parent, null, 2));
      */
      
      // Try different ways to access the field
      const value = parent.ON_CHEST || parent.ONCHEST || parent.on_chest || parent.onchest;
      //console.log('🔍 Resolved value:', value);
      
      return value;
    },
  },
  Query: {
    // Cursor-based pagination (GraphQL standard)
    allPersonsConnection: async (_parent, { first = 10, after, filter, submitter }, _context, _info) => {
      try {
        const { whereClause, params } = buildWhereClause(filter);
        //console.log('filter:', filter);
        if (filter != null) {   // falsy - ie. undefined or null, don't do !==, too stringest with undefined possible value
          console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${submitter.padEnd(30)} /who ${proper(filter.CHARNAME)}`);
        }
        else {
          console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${submitter.padEnd(30)} /whoall`);
        }
        //console.log('_info:', _context);
        // Get total count
        const countResult = await query(`SELECT COUNT(*) as total FROM Person ${whereClause}`, params);
        
        const totalCount = Number(countResult[0].TOTAL ?? countResult[0].total ?? 0);
        
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
        
        // Log the constructed SQL query
        //console.log('🔍 allPersonsConnection SQL Query:', queryStr);
        //console.log('🔍 allPersonsConnection SQL Params:', queryParams);
        
        const results = await query(queryStr, queryParams);
        
        // Debug: Log the first result to see what columns are returned
        /*
        if (results.length > 0) {
          console.log('🔍 First database result keys:', Object.keys(results[0]));
          console.log('🔍 First database result ON_CHEST:', results[0].ON_CHEST);
          console.log('🔍 First database result ONCHEST:', results[0].ONCHEST);
          console.log('🔍 First database result full:', JSON.stringify(results[0], null, 2));
        }
        */
        
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
        
        // Store CHARNAME in Proper case (e.g. nooka → Nooka); lookups stay case-insensitive
        const charname = proper(input.CHARNAME);

        // Neon Postgres function (ported from MySQL CreatePerson_v002); returns void
        await query(
          `SELECT "CreatePerson_v002"(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            charname,
            input.LIGHT ?? null,
            input.RING1 ?? null,
            input.RING2 ?? null,
            input.NECK1 ?? null,
            input.NECK2 ?? null,
            input.BODY ?? null,
            input.HEAD ?? null,
            input.LEGS ?? null,
            input.FEET ?? null,
            input.ARMS ?? null,
            input.SLUNG ?? null,
            input.HANDS ?? null,
            input.SHIELD ?? null,
            input.ABOUT ?? null,
            input.WAIST ?? null,
            input.POUCH ?? null,
            input.RWRIST ?? null,
            input.LWRIST ?? null,
            input.PRIMARY_WEAP ?? null,
            input.SECONDARY_WEAP ?? null,
            input.HELD ?? null,
            input.BOTH_HANDS ?? null,
            input.SUBMITTER ?? null,
            input.CLAN_ID ?? null,
            input.ONCHEST ?? null,
          ]
        );

        const rows = await query(
          `SELECT PERSON_ID FROM Person WHERE LOWER(CHARNAME) = LOWER(?) LIMIT 1`,
          [charname]
        );
        console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${(input.SUBMITTER ?? '').toString().padEnd(30)} /who ${charname}`);
        
        return { ...input, CHARNAME: charname, PERSON_ID: rows[0]?.PERSON_ID ?? null };
        
      } catch (error) {
        console.error('Error in addOrUpdatePerson:', error);
        throw new Error(`Failed to add or update person with CHARNAME: ${input.CHARNAME}`);
      }
    },

  },
}; 