import { query } from '../../services/db.mjs';
import moment from 'moment';
import { MYSQL_DATETIME_FORMAT } from '../../constants/index.js';

export const recentResolvers = {
  Query: {
    recent: async (_parent, { DISCORD_USER }, _context, _info) => {
      try {
        const logMessage = `${moment().format(MYSQL_DATETIME_FORMAT)} : ${(DISCORD_USER || 'Unknown').padEnd(30)} /recent`;
        console.log(logMessage);

        // Neon Postgres function (ported from MySQL GetRecent)
        const recentData = await query(`SELECT * FROM "GetRecent"()`, []);
        return recentData;
      } catch (error) {
        console.error('Error fetching recent data:', error);
        throw new Error('Failed to fetch recent data');
      }
    },
  },
};
