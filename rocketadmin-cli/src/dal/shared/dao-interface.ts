import { IPaginationRO, ITableSettings } from '../../interfaces/interfaces';
import { Knex } from 'knex';

export interface IDaoInterface {
  addRowInTable(tableName: string, row);

  configureKnex?(connectionConfig): Promise<Knex> | Knex;

  deleteRowInTable(tableName: string, primaryKey);

  getRowByPrimaryKey(tableName: string, primaryKey, settings: ITableSettings | Record<string, unknown>);

  getRowsFromTable(
    tableName: string,
    settings: any,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
  );

  getTableForeignKeys(tableName: string);

  getTablePrimaryColumns(tableName: string);

  getTablesFromDB();

  getTableStructure(tableName: string);

  testConnect(): Promise<ITestConnectResult>;

  updateRowInTable(tableName: string, row, primaryKey);

  validateSettings(settings: ITableSettings | Record<string, unknown>, tableName);

  getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  );
}

export interface IDaoRowsRO {
  data: Array<string>;
  pagination: IPaginationRO | Record<string, never>;
}

export interface ITestConnectResult {
  result: boolean;
  message: string;
}

export interface IPrimaryKeyInfo {
  column_name: string;
  data_type: string;
}
