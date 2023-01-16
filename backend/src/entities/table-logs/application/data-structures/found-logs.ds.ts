import { PaginationDs } from '../../../table/application/data-structures/pagination.ds.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../../enums/index.js';
import { TableLogsEntity } from '../../table-logs.entity.js';

export class FoundLogsDs {
  logs: Array<FoundLogRecordDs>;
  pagination: PaginationDs;
}

export class FoundLogRecordDs {
  cognitoUserName: string;
  connection_id: string;
  createdAt: Date;
  email: string;
  old_data: string;
  operationStatusResult: OperationResultStatusEnum;
  operationType: LogOperationTypeEnum;
  received_data: string;
  table_name: string;
}

export class FoundLogsEntities {
  logs: Array<TableLogsEntity>;
  pagination: PaginationDs;
}
