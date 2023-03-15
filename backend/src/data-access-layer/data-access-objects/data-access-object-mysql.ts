import knex from 'knex';
import { Knex } from 'knex';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto/index.js';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity.js';
import { FilterCriteriaEnum } from '../../enums/index.js';
import {
  changeObjPropValByPropName,
  checkFieldAutoincrement,
  compareArrayElements,
  getNumbersFromString,
  getPropertyValueByDescriptor,
  isObjectEmpty,
  listTables,
  objectKeysToLowercase,
  renameObjectKeyName,
  tableSettingsFieldValidator,
} from '../../helpers/index.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { Constants } from '../../helpers/constants/constants.js';
import { BasicDao } from '../shared/basic-dao.js';
import {
  IAutocompleteFieldsData,
  IDataAccessObject,
  IFilteringFieldsData,
  IForeignKey,
  IPrimaryKey,
  IReferecedTableNamesAndColumns,
  IRows,
  ITableStructure,
  ITestConnectResult,
} from '../shared/data-access-object-interface.js';

export class DataAccessObjectMysql extends BasicDao implements IDataAccessObject {
  private readonly connection: ConnectionEntity;
  constructor(connection: ConnectionEntity) {
    super();
    this.connection = connection;
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const promisesResults = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    const tableStructure = promisesResults[0];
    const primaryColumns = promisesResults[1];
    const jsonColumnNames = tableStructure
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });
    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        row = changeObjPropValByPropName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }

    const primaryKeysInStructure = tableStructure.map((el) => {
      return tableStructure.find((structureEl) => structureEl.column_name === el.column_name);
    });

    const autoIncrementPrimaryKey = primaryKeysInStructure.find((key) =>
      checkFieldAutoincrement(key.column_default, key.extra),
    );

    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    if (primaryColumns?.length > 0) {
      const primaryKeys = primaryColumns.map((column) => column.column_name);
      if (!autoIncrementPrimaryKey) {
        try {
          await knex(tableName).insert(row);
          const resultsArray = [];
          for (let i = 0; i < primaryKeys.length; i++) {
            // eslint-disable-next-line security/detect-object-injection
            resultsArray.push([primaryKeys[i], row[primaryKeys[i]]]);
          }
          return Object.fromEntries(resultsArray);
        } catch (e) {
          throw new Error(e);
        }
      } else {
        try {
          await knex(tableName).insert(row);
          const lastInsertId = await knex(tableName).select(knex.raw(`LAST_INSERT_ID()`));
          const resultObj = {};
          for (const [index, el] of primaryColumns.entries()) {
            // eslint-disable-next-line security/detect-object-injection
            resultObj[el.column_name] = lastInsertId[index]['LAST_INSERT_ID()'];
          }
          return resultObj;
        } catch (e) {
          throw new Error(e);
        }
      }
    } else {
      await knex(tableName).insert(row).returning(Object.keys(row));
    }
  }

  public async configureKnex(): Promise<Knex> {
    const { host, username, password, database, port, ssl, cert } = this.connection;
    const cachedKnex = Cacher.getCachedKnex(this.connection);
    if (cachedKnex) {
      return cachedKnex;
    }
    const newKnex = knex({
      client: 'mysql2',
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
      },
    });
    Cacher.setKnexCache(this.connection, newKnex);
    return newKnex;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
    const knex = await this.configureKnex();
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
    settings: TableSettingsEntity,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    if (!settings) {
      const result = await knex(tableName).where(primaryKey);
      return result[0] as Record<string, unknown>;
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const result = await knex(tableName).select(availableFields).where(primaryKey);
    return result[0] as Record<string, unknown>;
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFieldsData>,
    autocompleteFields: IAutocompleteFieldsData,
    userEmail: string,
  ): Promise<IRows> {
    if (!page || page <= 0) {
      page = Constants.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = Constants.DEFAULT_PAGINATION.perPage;
      }
    }
    const knex = await this.configureKnex();
    const promisesResults = await Promise.all([
      this.findAvaliableFields(settings, tableName),
      this.getRowsCount(knex, tableName, this.connection.database),
    ]);
    const availableFields = promisesResults[0];
    const { rowsCount, large_dataset } = promisesResults[1];
    const lastPage = Math.ceil(rowsCount / perPage);

    let rowsRO: IRows;

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
        .limit(Constants.AUTOCOMPLETE_ROW_LIMIT);
      rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset: large_dataset,
      };

      return rowsRO;
    }

    const rows = await knex(tableName)
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = settings;
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
      .modify((builder) => {
        if (settings.ordering_field && settings.ordering) {
          builder.orderBy(settings.ordering_field, settings.ordering);
        }
      })
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
      large_dataset,
    };

    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKey>> {
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const foreignKeys = await knex(tableName)
      .select(
        knex.raw(`COLUMN_NAME,CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME,
       REFERENCED_COLUMN_NAME`),
      )
      .from(
        knex.raw(
          `INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE
       TABLE_SCHEMA = ? AND
       TABLE_NAME  = ? AND REFERENCED_COLUMN_NAME IS NOT NULL;`,
          [this.connection.database, tableName],
        ),
      );

    const foreignKeysInLowercase = foreignKeys.map((key) => {
      return objectKeysToLowercase(key);
    });
    Cacher.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const primaryColumns = await knex(tableName)
      .select('COLUMN_NAME', 'DATA_TYPE')
      .from(knex.raw('information_schema.COLUMNS'))
      .where(
        knex.raw(
          `TABLE_SCHEMA = ? AND
      TABLE_NAME = ? AND
      COLUMN_KEY = 'PRI'`,
          [this.connection.database, tableName],
        ),
      );

    const primaryColumnsInLowercase = primaryColumns.map((column) => {
      return objectKeysToLowercase(column);
    });
    Cacher.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    const structureColumns = await knex('information_schema.columns')
      .select(
        'column_name',
        'column_default',
        'data_type',
        'column_type',
        'is_nullable',
        'character_maximum_length',
        'extra',
      )
      .orderBy('ordinal_position')
      .where({
        table_schema: this.connection.database,
        table_name: tableName,
      });

    const structureColumnsInLowercase = structureColumns.map((column) => {
      return objectKeysToLowercase(column);
    });

    for (const element of structureColumnsInLowercase) {
      element.is_nullable = element.is_nullable === 'YES';
      renameObjectKeyName(element, 'is_nullable', 'allow_null');
      if (element.data_type === 'enum') {
        const receivedStr = element.column_type.slice(6, element.column_type.length - 2);
        element.data_type_params = receivedStr.split("','");
      }
      if (element.data_type === 'set') {
        const receivedStr = element.column_type.slice(5, element.column_type.length - 2);
        element.data_type_params = receivedStr.split("','");
      }
      element.character_maximum_length = element.character_maximum_length
        ? element.character_maximum_length
        : getNumbersFromString(element.column_type)
        ? getNumbersFromString(element.column_type)
        : null;
    }
    Cacher.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase);
    return structureColumnsInLowercase;
  }

  public async getTablesFromDB(email?: string): Promise<Array<string>> {
    const knex = await this.configureKnex();
    return await listTables(knex);
  }

  public async testConnect(): Promise<ITestConnectResult> {
    const knex = await this.configureKnex();
    let result;
    try {
      result = await knex().select(1);
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
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    const tableStructure = await this.getTableStructure(tableName);
    const jsonColumnNames = tableStructure
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });
    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        row = changeObjPropValByPropName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }

    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async validateSettings(
    settings: CreateTableSettingsDto,
    tableName: string,
    userEmail: string,
  ): Promise<Array<string>> {
    const promisesResults = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    const tableStructure = promisesResults[0];
    const primaryColumns = promisesResults[1];
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<IReferecedTableNamesAndColumns>> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const knex = await this.configureKnex();
    const results: Array<IReferecedTableNamesAndColumns> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
        `
    SELECT
    TABLE_NAME as 'table_name',
    COLUMN_NAME as 'column_name'
    FROM
    information_schema.KEY_COLUMN_USAGE
    WHERE
    REFERENCED_TABLE_NAME = ?
    AND REFERENCED_COLUMN_NAME = ?
    AND TABLE_SCHEMA = ?;
      `,
        [tableName, primaryColumn.column_name, this.connection.database],
      );
      console.log(
        '🚀 ~ file: data-access-object-mysql.ts:499 ~ DataAccessObjectMysql ~ getReferencedTableNamesAndColumns ~ result:',
        result,
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: result[0],
      });
    }
    return results;
  }

  private async getRowsCount(
    knex: Knex,
    tableName: string,
    database: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    const fastCount = parseInt((await knex.raw(`SHOW TABLE STATUS IN ?? LIKE ?;`, [database, tableName]))[0][0].Rows);
    if (fastCount >= Constants.LARGE_DATASET_ROW_LIMIT) {
      return { rowsCount: fastCount, large_dataset: true };
    }
    const slowCount = (await knex(tableName).count('*'))[0]['count(*)'] as number;
    return { rowsCount: slowCount, large_dataset: false };
  }

  private async findAvaliableFields(settings: TableSettingsEntity, tableName: string): Promise<Array<string>> {
    let availableFields = [];
    const tableStructure = await this.getTableStructure(tableName);
    const fieldsFromStructure = tableStructure.map((el) => {
      return el.column_name;
    });

    if (isObjectEmpty(settings)) {
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
      return availableFields;
    }
    const excludedFields = settings.excluded_fields;

    if (settings.list_fields && settings.list_fields.length > 0) {
      if (!compareArrayElements(settings.list_fields, fieldsFromStructure)) {
        availableFields = [...settings.list_fields, ...fieldsFromStructure];
        availableFields = [...new Set(availableFields)];
        availableFields = availableFields.filter((fieldName) => {
          return fieldsFromStructure.includes(fieldName);
        });
      } else {
        availableFields = settings.list_fields;
      }
    } else {
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
    }
    if (excludedFields && excludedFields.length > 0) {
      for (const field of excludedFields) {
        const delIndex = availableFields.indexOf(field);
        if (delIndex >= 0) {
          availableFields.splice(availableFields.indexOf(field), 1);
        }
      }
    }
    return availableFields;
  }
}
