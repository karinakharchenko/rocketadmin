import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { objectKeysToLowercase } from '../../helpers/object-kyes-to-lowercase.js';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { QueryOrderingEnum } from '../shared/enums/query-ordering.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

export class DataAccessObjectMssql extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const knex = await this.configureKnex();
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKeys = primaryColumns.map((column) => column.column_name);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    if (primaryColumns?.length > 0) {
      const result = await knex(tableName).returning(primaryKeys).insert(row);
      return result[0];
    } else {
      const rowKeys = Object.keys(row);
      const result = await knex(tableName).returning(rowKeys).insert(row);
      return result[0];
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<string[]> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName)
      .modify((builder) => {
        if (identityColumnName) {
          builder.select(referencedFieldName, identityColumnName);
        } else {
          builder.select(referencedFieldName);
        }
      })
      .whereIn(referencedFieldName, fieldValues);
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    tableSettings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    if (!tableSettings) {
      const schemaName = await this.getSchemaName(tableName);
      tableName = `${schemaName}.[${tableName}]`;
      const knex = await this.configureKnex();
      return (await knex(tableName).where(primaryKey))[0] as unknown as Record<string, unknown>;
    }
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvaliableFields(tableSettings, tableStructure);
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return (await knex(tableName).select(availableFields).where(primaryKey))[0] as unknown as Record<string, unknown>;
  }

  public async getRowsFromTable(
    tableName: string,
    tableSettings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS> {
    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = tableSettings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }
    const knex = await this.configureKnex();
    const [rowsCount, tableStructure, tableSchema] = await Promise.all([
      this.getRowsCount(tableName),
      this.getTableStructure(tableName),
      this.getSchemaName(tableName),
    ]);
    const availableFields = this.findAvaliableFields(tableSettings, tableStructure);

    if (tableSchema) {
      tableName = `${tableSchema}.[${tableName}]`;
    }
    const lastPage = Math.ceil(rowsCount / perPage);
    /* eslint-enable */
    let rowsRO: FoundRowsDS;
    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableName)
        .select(autocompleteFields.fields)
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            fields.map((field, index) => {
              builder.orWhere(field, 'like', `${value}%`);
            });
          } else {
            return;
          }
          /*eslint-enable*/
        })
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);
      rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset: false,
      };

      return rowsRO;
    }

    if (!tableSettings?.ordering_field) {
      tableSettings.ordering_field = availableFields[0];
      tableSettings.ordering = QueryOrderingEnum.ASC;
    }
    const rows = await knex(tableName)
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = tableSettings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (search_fields && searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
            }
          }
        }
        /*eslint-enable*/
      })
      .modify((builder) => {
        if (filteringFields && filteringFields.length > 0) {
          for (const filterObject of filteringFields) {
            const { field, criteria, value } = filterObject;
            switch (criteria) {
              case FilterCriteriaEnum.eq:
                builder.andWhere(field, '=', `${value}`);
                break;
              case FilterCriteriaEnum.startswith:
                builder.andWhere(field, 'like', `${value}%`);
                break;
              case FilterCriteriaEnum.endswith:
                builder.andWhere(field, 'like', `%${value}`);
                break;
              case FilterCriteriaEnum.gt:
                builder.andWhere(field, '>', value);
                break;
              case FilterCriteriaEnum.lt:
                builder.andWhere(field, '<', value);
                break;
              case FilterCriteriaEnum.lte:
                builder.andWhere(field, '<=', value);
                break;
              case FilterCriteriaEnum.gte:
                builder.andWhere(field, '>=', value);
                break;
              case FilterCriteriaEnum.contains:
                builder.andWhere(field, 'like', `%${value}%`);
                break;
              case FilterCriteriaEnum.icontains:
                builder.andWhereNot(field, 'like', `%${value}%`);
                break;
              case FilterCriteriaEnum.empty:
                builder.orWhereNull(field);
                builder.orWhere(field, '=', `''`);
                break;
            }
          }
        }
      })
      .orderBy(tableSettings.ordering_field, tableSettings.ordering)
      .paginate({
        perPage: perPage,
        currentPage: page,
        isLengthAware: true,
      });
    const { data } = rows;
    const receivedPagination = rows.pagination;
    const pagination = {
      total: receivedPagination.total ? receivedPagination.total : rowsCount,
      lastPage: receivedPagination.lastPage ? receivedPagination.lastPage : lastPage,
      perPage: receivedPagination.perPage,
      currentPage: receivedPagination.currentPage,
    };
    rowsRO = {
      data,
      pagination,
      large_dataset: rowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
    };
    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const foreignKeys = await knex.raw(
      `SELECT ccu.constraint_name AS constraint_name
            , ccu.column_name     AS column_name
            , kcu.table_name      AS referenced_table_name
            , kcu.column_name     AS referenced_column_name
       FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                           ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                           ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
       WHERE ccu.TABLE_NAME = ?
         AND ccu.TABLE_SCHEMA = ?`,
      [tableName, schema],
    );
    const foreignKeysInLowercase: ForeignKeyDS[] = foreignKeys.map((key: Record<string, unknown>) => {
      return objectKeysToLowercase(key);
    });
    LRUStorage.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const primaryColumns = await knex.raw(
      `Select C.COLUMN_NAME
            , C.DATA_TYPE
       From INFORMATION_SCHEMA.COLUMNS As C Outer Apply (
      Select CCU.CONSTRAINT_NAME
      From INFORMATION_SCHEMA.TABLE_CONSTRAINTS As TC
             Join INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE As CCU
                  On CCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
      Where TC.TABLE_SCHEMA = C.TABLE_SCHEMA
      And TC.TABLE_NAME = C.TABLE_NAME
      And TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
                    And CCU.COLUMN_NAME = C.COLUMN_NAME
      ) As Z
       Where C.TABLE_NAME = ? AND Z.CONSTRAINT_NAME is not null AND C.TABLE_SCHEMA = ?;`,
      [tableName, schema],
    );

    const primaryColumnsInLowercase: PrimaryKeyDS[] = primaryColumns.map((column: Record<string, unknown>) => {
      return objectKeysToLowercase(column);
    });
    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const knex = await this.configureKnex();
    const query = `
    SELECT TABLE_NAME,
       CASE
           WHEN TABLE_TYPE = 'BASE TABLE' THEN 0
           ELSE 1
           END AS isView
FROM ??.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
UNION
SELECT TABLE_NAME,
       CASE
           WHEN TABLE_TYPE = 'BASE TABLE' THEN 0
           ELSE 1
           END AS isView
FROM ??.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'VIEW'
    `;
    let result = await knex.raw(query, [this.connection.database, this.connection.database]);
    return result.map((table: { TABLE_NAME: string; isView: number }) => {
      return { tableName: table.TABLE_NAME, isView: table.isView === 1 };
    });
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const structureColumns = await knex('information_schema.COLUMNS')
      .select('COLUMN_NAME', 'COLUMN_DEFAULT', 'DATA_TYPE', 'IS_NULLABLE', 'CHARACTER_MAXIMUM_LENGTH')
      .orderBy('ORDINAL_POSITION')
      .where({
        table_catalog: this.connection.database,
        table_name: tableName,
        table_schema: schema,
      });

    let generatedColumns = await knex.raw(
      `select COLUMN_NAME
         from INFORMATION_SCHEMA.COLUMNS
         where COLUMNPROPERTY(object_id(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
           AND TABLE_CATALOG = ?
           AND TABLE_NAME = ?
           AND TABLE_SCHEMA = ?`,
      [this.connection.database, tableName, schema],
    );

    generatedColumns = generatedColumns.map((column) => column.COLUMN_NAME);

    const structureColumnsInLowercase = structureColumns.map((column) => {
      return objectKeysToLowercase(column);
    });

    structureColumnsInLowercase.map((column) => {
      renameObjectKeyName(column, 'is_nullable', 'allow_null');
      column.allow_null = column.allow_null === 'YES';
      if (generatedColumns.indexOf(column.column_name) >= 0) {
        column.column_default = 'autoincrement';
      }
      return column;
    });
    LRUStorage.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase as TableStructureDS[]);
    return structureColumnsInLowercase as TableStructureDS[];
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const knex = await this.configureKnex();
    try {
      const result = await knex().select(1);
      if (result) {
        return {
          result: true,
          message: 'Successfully connected',
        };
      }
    } catch (e) {
      return {
        result: false,
        message: e.message,
      };
    }
    return {
      result: false,
      message: 'Connection failed',
    };
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const [knex, schemaName] = await Promise.all([this.configureKnex(), this.getSchemaName(tableName)]);
    tableName = `${schemaName}.[${tableName}]`;
    return knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<string[]> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<ReferencedTableNamesAndColumnsDS[]> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const knex = await this.configureKnex();
    const results: Array<ReferencedTableNamesAndColumnsDS> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
        `
SELECT 
  OBJECT_NAME(f.parent_object_id) "table_name",
  COL_NAME(fc.parent_object_id,fc.parent_column_id) "column_name"
FROM 
   sys.foreign_keys AS f
INNER JOIN 
  sys.foreign_key_columns AS fc 
    ON f.OBJECT_ID = fc.constraint_object_id
INNER JOIN 
  sys.tables t 
   ON t.OBJECT_ID = fc.referenced_object_id
WHERE 
   OBJECT_NAME (f.referenced_object_id) = ?
      `,
        tableName,
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: [result[0]],
      });
    }
    return results;
  }

  public async isView(tableName: string): Promise<boolean> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaNameWithoutBrackets(tableName);
    const result = await knex('information_schema.tables')
      .select('TABLE_TYPE')
      .where('TABLE_SCHEMA', schemaName)
      .andWhere('TABLE_NAME', tableName);

    if (result.length === 0) {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
    }
    return result[0].TABLE_TYPE === 'VIEW';
  }

  private async getSchemaName(tableName: string): Promise<string> {
    if (this.connection.schema) {
      return `[${this.connection.schema}]`;
    }
    const knex = await this.configureKnex();
    const queryResult =
      await knex.raw(`SELECT QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
                      FROM
                          sys.objects AS sOBJ
                          INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
                      ON sOBJ.object_id = sdmvPTNS.object_id
                      WHERE
                          sOBJ.type = 'U'
                        AND sOBJ.is_ms_shipped = 0x0
                        AND sdmvPTNS.index_id
                          < 2
                      GROUP BY
                          sOBJ.schema_id
                              , sOBJ.name
                      ORDER BY [TableName]`);
    let tableSchema = undefined;
    for (const row of queryResult) {
      if (row.TableName.includes(tableName)) {
        tableSchema = row.TableName.split('.')[0];
      }
    }
    return tableSchema;
  }

  private async getRowsCount(tableName: string): Promise<number> {
    const knex = await this.configureKnex();
    const countQueryResult = await knex.raw(
      `SELECT QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
       FROM
           sys.objects AS sOBJ
           INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
       ON sOBJ.object_id = sdmvPTNS.object_id
       WHERE
           sOBJ.type = 'U'
         AND sOBJ.is_ms_shipped = 0x0
         AND sdmvPTNS.index_id
           < 2
         AND sOBJ.name = ?
       GROUP BY
           sOBJ.schema_id
               , sOBJ.name
       ORDER BY [TableName]`,
      [tableName],
    );
    const rowsCount = countQueryResult[0].RowCount;
    return parseInt(rowsCount);
  }

  private async getSchemaNameWithoutBrackets(tableName: string): Promise<string> {
    const schema = await this.getSchemaName(tableName);
    if (!schema) {
      throw new Error(ERROR_MESSAGES.TABLE_SCHEMA_NOT_FOUND(tableName));
    }
    const matches = schema.match(/\[(.*?)\]/);
    return matches[1];
  }
}
