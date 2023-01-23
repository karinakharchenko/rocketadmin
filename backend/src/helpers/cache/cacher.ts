import { Knex } from 'knex';
import LRU from 'lru-cache';
import {
  IForeignKey,
  IPrimaryKey,
  ITableStructure,
} from '../../data-access-layer/shared/data-access-object-interface.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { Constants } from '../constants/constants.js';

const knexCache = new LRU(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRU(Constants.DEFAULT_TUNNEL_CACHE_OPTIONS);
const driverCache = new LRU(Constants.DEFAULT_DRIVER_CACHE_OPTIONS);
const invitationCache = new LRU(Constants.DEFAULT_INVITATION_CACHE_OPTIONS);
const tableStructureCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);

export class Cacher {
  public static increaseGroupInvitationsCacheCount(groupId: string): void {
    let groupCount = Cacher.getGroupInvitationCachedCount(groupId);
    invitationCache.set(groupId, ++groupCount);
    return;
  }

  public static increaseUserInvitationsCacheCount(userId: string): void {
    let userCount = Cacher.getUserInvitationCachedCount(userId);
    invitationCache.set(userId, ++userCount);
    return;
  }

  public static getUserInvitationCachedCount(userId: string): number {
    const cachedCount = invitationCache.get(userId) as number;
    return cachedCount ? cachedCount : 0;
  }

  public static getGroupInvitationCachedCount(groupId: string): number {
    const cachedCount = invitationCache.get(groupId) as number;
    return cachedCount ? cachedCount : 0;
  }

  public static canInvite(userId: string, groupId: string): boolean {
    const userInvitations = Cacher.getUserInvitationCachedCount(userId);
    const groupInvitations = Cacher.getGroupInvitationCachedCount(groupId);
    return userInvitations <= 10 && groupInvitations <= 10;
  }

  public static getCachedKnex(connectionConfig): Knex {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig)) as Knex;
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig, newKnex: Knex): void {
    knexCache.set(JSON.stringify(connectionConfig), newKnex);
  }

  public static getTunnelCache(connection: ConnectionEntity): any {
    const cachedTnl = tunnelCache.get(JSON.stringify(connection));
    return cachedTnl ? cachedTnl : null;
  }

  public static setTunnelCache(connection: ConnectionEntity, tnlObj): void {
    tunnelCache.set(JSON.stringify(connection), tnlObj);
  }

  public static delTunnelCache(connection: ConnectionEntity): void {
    tunnelCache.delete(JSON.stringify(connection));
  }

  public static getDriverCache(connection: ConnectionEntity): any {
    const cachedDriver = driverCache.get(JSON.stringify(connection));
    return cachedDriver ? cachedDriver : null;
  }

  public static setDriverCache(connection: ConnectionEntity, newDriver): void {
    driverCache.set(JSON.stringify(connection), newDriver);
  }

  public static delDriverCache(connection: ConnectionEntity): void {
    driverCache.del(JSON.stringify(connection));
  }

  public static setTableStructureCache(
    connection: ConnectionEntity,
    tableName: string,
    structure: Array<ITableStructure>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableStructureCache.set(cacheObj, structure);
  }

  public static getTableStructureCache(connection: ConnectionEntity, tableName: string): Array<ITableStructure> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundStructure = tableStructureCache.get(cacheObj) as Array<ITableStructure>;
    return foundStructure ? foundStructure : null;
  }

  public static setTablePrimaryKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    primaryKeys: Array<IPrimaryKey>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tablePrimaryKeysCache.set(cacheObj, primaryKeys);
  }

  public static getTablePrimaryKeysCache(connection: ConnectionEntity, tableName: string): Array<IPrimaryKey> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tablePrimaryKeysCache.get(cacheObj) as Array<IPrimaryKey>;
    return foundKeys ? foundKeys : null;
  }

  public static setTableForeignKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    foreignKeys: Array<IForeignKey>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableForeignKeysCache.set(cacheObj, foreignKeys);
  }

  public static getTableForeignKeysCache(connection: ConnectionEntity, tableName: string): Array<IForeignKey> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tableForeignKeysCache.get(cacheObj) as Array<IForeignKey>;
    return foundKeys ? foundKeys : null;
  }

  public static async clearAllCache(): Promise<void> {
    await knexCache.clear();
    await tunnelCache.clear();
    await driverCache.clear();
    await invitationCache.clear();
    await tableStructureCache.clear();
    await tableForeignKeysCache.clear();
    await tablePrimaryKeysCache.clear();
  }
}
