import { Knex } from 'knex';
import { Database } from 'ibm_db';
export const CACHING_CONSTANTS = {
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (knex: Knex) => {
      await knex.destroy();
    },
  },

  DEFAULT_IMDB_DB2_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (db: Database) => {
      await db.close();
    },
  },

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 100,
    ttl: 1000 * 60 * 60,
    dispose: async (tnl: any) => {
      try {
        await tnl.server.close();
        await tnl.client.destroy();
      } catch (e) {
        console.error('Tunnel closing error: ' + e);
      }
    },
  },
  DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60,
  },
};
