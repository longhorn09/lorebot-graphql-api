import { query } from '../../services/db.mjs';
import moment from 'moment';
import { MYSQL_DATETIME_FORMAT } from '../../constants/index.js';

export const recentResolvers = {
  Query: {
    recent: async (_parent, { DISCORD_USER }, _context, _info) => {
      try {
        // Log the Discord user who made the request
        /*
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const paddedUser = (DISCORD_USER || 'Unknown').padEnd(30);
        console.log(`${timestamp} : ${paddedUser} !recent`);
        */
        console.log(`${moment().format(MYSQL_DATETIME_FORMAT)} : ${(DISCORD_USER || 'Unknown').padEnd(30)} !recent`);
        
        // Placeholder for stored procedure call that takes no input arguments
        const sqlStr = "CALL GetRecent()";
        
        //console.log('Executing stored procedure:', sqlStr);
        
        // Execute the stored procedure
        const result = await query(sqlStr, []);
        //console.log('Recent data:', result);
        
        // Extract the actual data from the result (first element of the array)
        // The stored procedure returns [data, ResultSetHeader]
        const recentData = Array.isArray(result) && result.length > 0 ? result[0] : result;
        
        // Return the recent data
        return recentData;
        
      } catch (error) {
        console.error('Error fetching recent data:', error);
        throw new Error('Failed to fetch recent data');
      }
    },
  },
}; 