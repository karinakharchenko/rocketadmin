import { Knex } from 'knex';
import { TunnelCreator } from '../../dal/shared/tunnel-creator.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto/index.js';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity.js';
import { FilterCriteriaEnum } from '../../enums/index.js';
import {
  changeObjPropValByPropName,
  compareArrayElements,
  getPropertyValueByDescriptor,
  isObjectEmpty,
  listTables,
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
import { getPostgresKnex } from '../shared/utils/get-postgres-knex.js';

export class DataAccessObjectPostgres extends BasicDao implements IDataAccessObject {
  private readonly connection: ConnectionEntity;
  constructor(connection: ConnectionEntity) {
    super();
    this.connection = connection;
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
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

    if (primaryColumns?.length > 0) {
      const primaryKey = primaryColumns.map((column) => column.column_name);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(primaryKey)
        .insert(row);
      return result[0] as unknown as Record<string, unknown>;
    } else {
      const rowFields = Object.keys(row);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(rowFields)
        .insert(row);
      return result[0] as any;
    }
  }

  public async configureKnex(): Promise<Knex> {
    const cachedKnex = Cacher.getCachedKnex(this.connection);
    if (cachedKnex) {
      return cachedKnex;
    }
    if (this.connection.ssh) {
      const newKnex = await TunnelCreator.createTunneledKnex(this.connection);
      Cacher.setKnexCache(this.connection, newKnex);
      return newKnex;
    } else {
      return getPostgresKnex(this.connection);
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .del();
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
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
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
    if (!settings) {
      const knex = await this.configureKnex();
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .where(primaryKey);
      return result[0] as unknown as Record<string, unknown>;
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex();
    const result = await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .select(availableFields)
      .where(primaryKey);
    console.log('=>(data-access-object-postgres.ts:152) get row by primary key', result);
    return result[0] as unknown as Record<string, unknown>;
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
    const tableSchema = this.connection.schema ? this.connection.schema : 'public';

    const promisesResults = await Promise.all([
      this.getRowsCount(knex, tableName, tableSchema),
      this.findAvaliableFields(settings, tableName),
    ]);
    const { rowsCount, large_dataset } = promisesResults[0];
    const availableFields = promisesResults[1];
    const lastPage = Math.ceil(rowsCount / perPage);
    let rowsRO: IRows;

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .select(autocompleteFields.fields)
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            fields.map((field, index) => {
              builder.orWhereRaw(`CAST (?? AS TEXT) LIKE '${value}%'`, [field]);
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
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
    let { pagination } = rows;
    pagination = {
      total: pagination.total ? pagination.total : rowsCount,
      lastPage: pagination.lastPage ? pagination.lastPage : lastPage,
      perPage: pagination.perPage,
      currentPage: pagination.currentPage,
    } as any;
    rowsRO = {
      data,
      pagination,
      large_dataset: large_dataset,
    };
    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKey>> {
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const tableSchema = this.connection.schema ? this.connection.schema : 'public';
    const foreignKeys: Array<{
      foreign_column_name: string;
      foreign_table_name: string;
      constraint_name: string;
      column_name: string;
    }> = await knex(tableName)
      .select(
        knex.raw(`tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name`),
      )
      .from(
        knex.raw(
          `information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=? AND tc.table_schema =?;`,
          [tableName, tableSchema],
        ),
      );
    const resultKeys = foreignKeys.map((key) => {
      return {
        referenced_column_name: key.foreign_column_name,
        referenced_table_name: key.foreign_table_name,
        constraint_name: key.constraint_name,
        column_name: key.column_name,
      };
    });
    Cacher.setTableForeignKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    tableName = this.attachSchemaNameToTableName(tableName);
    const primaryColumns: Array<any> = await knex(tableName)
      .select(knex.raw('a.attname, format_type(a.atttypid, a.atttypmod) AS data_type'))
      .from(knex.raw('pg_index i'))
      .join(knex.raw('pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)'))
      .where(knex.raw(`i.indrelid = ?::regclass AND i.indisprimary;`, tableName));
    const resultKeys = primaryColumns.map((column) => {
      return {
        column_name: column.attname,
        data_type: column.data_type,
      };
    });
    Cacher.setTablePrimaryKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    let result = await knex('information_schema.columns')
      .select('column_name', 'column_default', 'data_type', 'udt_name', 'is_nullable', 'character_maximum_length')
      .orderBy('dtd_identifier')
      .where(`table_name`, tableName)
      .andWhere('table_schema', this.connection.schema ? this.connection.schema : 'public');
    const customTypeIndexes = [];
    result = result.map((element, i) => {
      element.is_nullable = element.is_nullable === 'YES';
      renameObjectKeyName(element, 'is_nullable', 'allow_null');
      if (element.data_type === 'USER-DEFINED') {
        customTypeIndexes.push(i);
      }
      return element;
    });

    if (customTypeIndexes.length >= 0) {
      for (let i = 0; i < customTypeIndexes.length; i++) {
        const customTypeInTableName = result[customTypeIndexes.at(i)].udt_name;
        const customTypeAttrsQueryResult = await knex.raw(
          `select attname, format_type(atttypid, atttypmod)
           from pg_type
                    join pg_class on pg_class.oid = pg_type.typrelid
                    join pg_attribute on pg_attribute.attrelid = pg_class.oid
           where typname = ?
           order by attnum`,
          customTypeInTableName,
        );
        const customTypeAttrs = customTypeAttrsQueryResult.rows;
        const enumLabelQueryResult = await knex.raw(
          `SELECT e.enumlabel
           FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = ?`,
          customTypeInTableName,
        );
        let enumLabelRows = [];
        if (enumLabelQueryResult && enumLabelQueryResult.rows && enumLabelQueryResult.rows.length > 0) {
          enumLabelRows = enumLabelQueryResult.rows;

          enumLabelRows = enumLabelRows.map((el) => {
            return el.enumlabel;
          });
        }
        if (enumLabelRows && enumLabelRows.length > 0) {
          //has own property check for preventing object injection
          if (result.hasOwnProperty(customTypeIndexes.at(i))) {
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type = 'enum';
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type_params = enumLabelRows;
          }
        }

        if (customTypeAttrs && customTypeAttrs.length > 0) {
          const customDataTypeRo = [];
          for (const attr of customTypeAttrs) {
            customDataTypeRo.push({
              column_name: attr.attname,
              data_type: attr.format_type,
            });
          }
          //has own property check for preventing object injection
          if (result.hasOwnProperty(customTypeIndexes.at(i))) {
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type =
              // eslint-disable-next-line security/detect-object-injection
              result[customTypeIndexes[i]].udt_name;
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type_params = customDataTypeRo;
          }
        }
      }
    }
    Cacher.setTableStructureCache(this.connection, tableName, result);
    return result;
  }

  public async getTablesFromDB(email?: string): Promise<Array<string>> {
    const knex = await this.configureKnex();
    return await listTables(knex, this.connection.schema);
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
    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<IReferecedTableNamesAndColumns>> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const schema = this.connection.schema ? this.connection.schema : 'public';
    const knex = await this.configureKnex();
    const results: Array<IReferecedTableNamesAndColumns> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
        `
      SELECT
          r.table_name, r.column_name
      FROM information_schema.constraint_column_usage       u
      INNER JOIN information_schema.referential_constraints fk
                 ON u.constraint_catalog = fk.unique_constraint_catalog
                     AND u.constraint_schema = fk.unique_constraint_schema
                     AND u.constraint_name = fk.unique_constraint_name
      INNER JOIN information_schema.key_column_usage        r
                 ON r.constraint_catalog = fk.constraint_catalog
                     AND r.constraint_schema = fk.constraint_schema
                     AND r.constraint_name = fk.constraint_name
      WHERE
          u.column_name = ? AND
          u.table_catalog = ? AND
          u.table_schema = ? AND
          u.table_name = ?
      `,
        [primaryColumn.column_name, this.connection.database, schema, tableName],
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: result.rows,
      });
    }
    return results;
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

  private attachSchemaNameToTableName(tableName: string): string {
    if (this.connection.schema) {
      tableName = `"${this.connection.schema}"."${tableName}"`;
    } else {
      tableName = `"public"."${tableName}"`;
    }
    return tableName;
  }

  private async getRowsCount(
    knex: Knex,
    tableName: string,
    tableSchema: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    try {
      const fastCount = await knex.raw(
        `
  SELECT ((reltuples / relpages)
  * (pg_relation_size('??.??') / current_setting('block_size')::int)
         )::bigint as count
FROM   pg_class
WHERE  oid = '??.??'::regclass;`,
        [tableSchema, tableName, tableSchema, tableName],
      );

      if (fastCount >= Constants.LARGE_DATASET_ROW_LIMIT) {
        return {
          rowsCount: fastCount,
          large_dataset: true,
        };
      }
    } catch (e) {
      return { rowsCount: 0, large_dataset: false };
    }
    const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
    const slowCount = parseInt(count[0].count);
    return {
      rowsCount: slowCount,
      large_dataset: false,
    };
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
