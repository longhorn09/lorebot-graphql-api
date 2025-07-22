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



/**
 * Validates if the criteria string contains valid key-value pairs
 * Supports operators: =, >, <, >=, <=
 * Multiple pairs separated by &
 * Exact same function and validation logic as used client side in lorebot-discord-client
 * @param {string} criteria - The criteria string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCriteria = (criteria) => {
  let isValid = true;
  
  // Check if criteria is empty or null
  //console.log("criteria:", criteria);
  if (!criteria || criteria.trim() === '') {
    isValid = false;
  } 
  else {
    // Split by & to get individual key-value pairs
    const pairs = criteria.split('&');
    
    // Check each pair
    for (const pair of pairs) {
      const trimmedPair = pair.trim();
      
      // Skip empty pairs
      if (trimmedPair.length === 0 || trimmedPair == '') {
        continue;
      }
      
      // Check if pair matches the pattern: key=value, key>value, key<value, key>=value, key<=value
      const patternRegex = /^([A-Za-z\_]+)(?:=|>|<|>=|<=)\s*(?:[^\&\=\<\>])+\s*$/;
      
      if (!patternRegex.test(trimmedPair)) {
        isValid = false;
        break;
      }
      else {
        // make sure one of the expected key name pairs
        switch (patternRegex.exec(trimmedPair)[1].toLowerCase()) {
          case "speed":
          case "accuracy":
          case "power":
          case "charges":
          case "weight":
          case "item_value":
          case "apply":
          case "capacity":
          case "container_size":
          case "item_type":
          case "item_is":
          case "submitter":
          case "restricts":
          case "class":
          case "mat_class":
          case "material":
          case "immune":
          case "effects":
          case "damage":                      
          case "affects":            
          case "object_name":
          case "can_use":
            isValid = true;
            break;
          default:
            isValid = false;
            break;
          }
        }
    }
  }
  //console.log("in isValidCriteria():", isValid);
  return isValid;
} 

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

/**
 * Helper function to build conditions from flexCriteria
 * @param {*} flexCriteria this is a string in the format of "weight>=10&item_value=100&item_type=weapon"
 * @returns 
 */
const buildConditionsFromFlexCriteria = (flexCriteria) => {
  const conditions = [];
  const params = [];
  let half1= null ;
  let half2= null;
  let match = null;
  let affectsArr = []
  
  if (!isValidCriteria(flexCriteria)) {
    return { conditions: [], params: [] };
  }
  
  const pairs = flexCriteria.split('&');
  
  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    
    if (trimmedPair.length === 0 || trimmedPair == '') {
      continue;
    }
    
    const patternRegex = /^([A-Za-z\_]+)(=|>|<|>=|<=)\s*([^\&\=\<\>]+)\s*$/;
    
    if (patternRegex.test(trimmedPair)) {
      const fieldName = patternRegex.exec(trimmedPair)[1].toString().toLowerCase();
      const operator = patternRegex.exec(trimmedPair)[2].toString();
      const value = patternRegex.exec(trimmedPair)[3].toString().trim();
      
      // Handle special case for 'value' field
      if (fieldName == 'value' || fieldName == 'item_value' || fieldName == 'item value') {
        conditions.push('ITEM_VALUE ' + operator + ' ?');
      } else {
        conditions.push(fieldName.toUpperCase() + ' ' + operator + ' ?');
      }
      
      switch (fieldName) {
        // Integer fields
        case "speed":
        case "accuracy":
        case "power":
        case "charges":
        case "weight":
        case "item_value":
        case "apply":
        case "capacity":
        case "container_size":
          const intValue = parseInt(value);
          if (isNaN(intValue)) {
            console.warn(`⚠️  Invalid integer value for field ${fieldName}: "${value}". Skipping condition.`);
            continue;
          }
          params.push(parseInt(value));
          break;
          
        // String fields that should use LIKE with wildcards
        case "item_type":
        case "item_is":
        case "submitter":
        case "restricts":
        case "class":
        case "mat_class":
        case "material":
        case "immune":
        case "effects":
        case "damage":
        case "can_use":
          conditions[conditions.length - 1] = fieldName.toUpperCase() + ' LIKE ?';
          params.push(`%${value}%`);
          break;
        case "affects":
          // need to handle two situations:
          // (1) MULTIPLE AFFECTS
          //     spell slots by +1 at level 6,spell slots by +1 at level 8,INT by 1,WIS by 1
          //     HITROLL by 3,DAMROLL by 3
          // (2) SINGLE LINE AFFECT
          //     casting level by 2
          //     HEALTH by 5
          
          affectsArr = value.split(",");
          //console.log(`affectsArr.length:`, affectsArr.length);
          
          for (let i = 0; i < affectsArr.length; i++) {
            half1 = null, half2 = null, match = null;   
            //console.log(`affectsArr[${affectsArr.length}]:`, affectsArr[i]);
            if (/^([A-Za-z_\s]+)\s+by\s+([+-]?\d+(?:[A-Za-z_\s\d]+)?)$/.test( affectsArr[i].trim())) {
              match = /^([A-Za-z_\s]+)\s+by\s+([+-]?\d+(?:[A-Za-z_\s\d]+)?)$/.exec(affectsArr[i].trim());
              if (match != null && match.length === 3) {      // think matching index [0,1,2] -> length = 3
                half1 = match[1].trim();
                var temphalf2 = match[2].trim();
                half2 = temphalf2.replace(/\+/g, '\\+?'); 
                
                //console.log(`matched: ${half1} ${half2}`);
                if (i === 0){
                  conditions[conditions.length - 1]= `REGEXP_LIKE(Lore.${fieldName.toUpperCase()}, ?)`;
                  params.push(`.*${half1}\\s+by\\s+${half2}.*$`);
                }
                else {
                  conditions.push(`REGEXP_LIKE(Lore.${fieldName.toUpperCase()}, ?)`);
                  params.push(`.*${half1}\\s+by\\s+${half2}.*$`);
                }
              }
            }
          }
          //affectsArr.push(value);
          break;
        default:
          params.push(value);
          break;
      }
    }
  }
  
  return { conditions, params };
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
    allLorePaginated: async (_parent, { first = 10, after, searchToken, submitter }, context, _info) => {
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
        const countResult = await query(countQueryStr, searchParams);   // <== query execution here
        const totalCount = countResult[0].total;
        
        // Add ordering and limit
        const limit = first + 1; // Get one extra to check if there's a next page
        queryStr += ` ORDER BY LORE_ID ASC LIMIT ${limit}`;
        
        
        const results = await query(queryStr, queryParams);       // <== query execution here
        if (after === null) {
          if (requestedFields.toString().trim() == "LORE_ID,OBJECT_NAME" || requestedFields.toString().trim() == "OBJECT_NAME") {
            console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${(submitter || 'unknown').toString().padEnd(30)} /brief ${searchToken}`);
          }
          else {
            console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${(submitter || 'unknown').toString().padEnd(30)} /stat ${searchToken}`);
          }
        }
        
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
     * Flexible query with dynamic criteria - allows custom search logic
     * @param {*} _parent 
     * @param {*} param1 
     * @param {*} context 
     * @param {*} _info 
     * @returns 
     */
    FlexQuery: async (_parent, { first = 10, after, requestor, flexCriteria }, context, _info) => {
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
        
        // Build WHERE conditions using helper function
        const { conditions, params: flexParams } = buildConditionsFromFlexCriteria(flexCriteria);
        
        if (conditions.length === 0 && flexCriteria) {
          // Invalid criteria
          return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 };
        }
        
        // Add flex criteria params to query params
        queryParams.push(...flexParams);

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
        
        // Log the constructed SQL from buildConditionsFromFlexCriteria
        /*
        console.log('🔍 FlexQuery SQL constructed from buildConditionsFromFlexCriteria:');
        console.log('🔍 Base query:', `SELECT ${selectFields} FROM Lore`);
        console.log('🔍 Conditions:', conditions);
        console.log('🔍 Flex params:', flexParams);
        */
        console.log('🔍 Final queryStr:', queryStr);
        console.log('🔍 Final queryParams:', queryParams);
        
        // Build count query with same conditions but NO cursor condition
        let countQueryStr = 'SELECT COUNT(*) as total FROM Lore';
        const { conditions: countConditions, params: countParams } = buildConditionsFromFlexCriteria(flexCriteria);
        
        if (countConditions.length > 0) {
          countQueryStr += ` WHERE ${countConditions.join(' AND ')}`;
        }
        
        // Log the count query constructed from buildConditionsFromFlexCriteria
        /*
        console.log('🔍 FlexQuery COUNT SQL constructed from buildConditionsFromFlexCriteria:');
        console.log('🔍 Count conditions:', countConditions);
        console.log('🔍 Count params:', countParams);
        console.log('🔍 Final countQueryStr:', countQueryStr);
        */
        // ##### BEGIN COUNT(*) QUERY EXECUTION ######################
        const countResult = await query(countQueryStr, countParams);        
        const totalCount = countResult[0].total;
        
        // ##### END COUNT(*) QUERY EXECUTION ########################
        
        // Add ordering and limit for main query
        const limit = first + 1; // Get one extra to check if there's a next page
        queryStr += ` ORDER BY LORE_ID ASC LIMIT ${limit}`;
        
        // Debug pagination info
        /*
        console.log(`📄 Pagination: first=${first}, after=${after}, limit=${limit}`);
        if (after) {
          console.log(`📄 Cursor decoded: ${decodeCursor(after)}`);
        }
        */
        // Log only the initial query execution (not pagination requests)
        if (after === null) {
          console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${requestor.padEnd(30)} /query criteria ${flexCriteria}`);
        }        
        
        // ###################### BEGIN QUERY EXECUTION ########################
        const results = await query(queryStr, queryParams);
        // ###################### END QUERY EXECUTION ########################
        
        
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
        console.error('Error in FlexQuery:', error);
        throw new Error('Failed to execute flexible query');
      }
    },
  },

  Mutation: {
    addOrUpdateLore: async (_parent, { input }, _context, _info) => {
      try {
        const { OBJECT_NAME, ...loreData } = input;
        
       // console.log('loreData:', loreData);
        // Build stored procedure call with parameters in the same order as the example
        const sqlStr = "CALL CreateLore_v002(" +
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
          ((loreData.DAMAGE) ? `'${loreData.DAMAGE}'` : null) + "," +
          ((loreData.CAN_USE) ? `'${loreData.CAN_USE}'` : null) + ")" ;  
          
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