import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds';
import { IStructureRO, ITableRowRO } from '../table.interface';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs): Promise<Array<FoundTableDs>>;
}

export interface IGetTableRows {
  execute(inputData: GetTableRowsDs): Promise<FoundTableRowsDs>;
}

export interface IGetTableStructure {
  execute(inputData: GetTableStructureDs): Promise<IStructureRO>;
}

export interface IAddRowInTable {
  execute(inputData: AddRowInTableDs): Promise<ITableRowRO>;
}
