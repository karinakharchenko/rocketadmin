import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object.js';
import {
  IForeignKey,
  IForeignKeyWithForeignColumnName,
} from '../../../data-access-layer/shared/data-access-object-interface.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { buildFoundTableWidgetDs } from '../../widget/utils/build-found-table-widget-ds.js';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds.js';
import { IForeignKeyInfo, IStructureRO } from '../table.interface.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { IGetTableStructure } from './table-use-cases.interface.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';

@Injectable()
export class GetTableStructureUseCase
  extends AbstractUseCase<GetTableStructureDs, IStructureRO>
  implements IGetTableStructure
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetTableStructureDs): Promise<IStructureRO> {
    const { connectionId, masterPwd, tableName, userId } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const dao = createDataAccessObject(foundConnection, userId);

      let userEmail: string;
      if (isConnectionTypeAgent(foundConnection.type)) {
        userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      }
      // eslint-disable-next-line prefer-const
      let [tableSettings, tablePrimaryColumns, tableForeignKeys, tableStructure, tableWidgets] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableForeignKeys(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      ]);
      const foreignKeysFromWidgets: Array<IForeignKeyInfo> = tableWidgets
        .filter((el) => {
          return el.widget_type === WidgetTypeEnum.Foreign_key;
        })
        .map((widget) => {
          return widget.widget_params as unknown as IForeignKeyInfo;
        });

      tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);
      let transformedTableForeignKeys: Array<IForeignKeyWithForeignColumnName> = [];
      if (tableForeignKeys && tableForeignKeys.length > 0) {
        transformedTableForeignKeys = await Promise.all(
          tableForeignKeys.map((el) => {
            try {
              return this.attachForeignColumnNames(el, userId, connectionId, dao);
            } catch (e) {
              return el as IForeignKeyWithForeignColumnName;
            }
          }),
        );
      }
      const readonly_fields = tableSettings?.readonly_fields?.length > 0 ? tableSettings.readonly_fields : [];
      const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
      return {
        structure: formedTableStructure,
        primaryColumns: tablePrimaryColumns,
        foreignKeys: transformedTableForeignKeys,
        readonly_fields: readonly_fields,
        table_widgets: tableWidgets?.length > 0 ? tableWidgets.map((widget) => buildFoundTableWidgetDs(widget)) : [],
        list_fields: tableSettings?.list_fields ? tableSettings.list_fields : [],
      };
    } catch (e) {
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLE_STRUCTURE} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async attachForeignColumnNames(
    foreignKey: IForeignKey,
    userId: string,
    connectionId: string,
    dao: IDataAccessObject | IDataAccessObjectAgent,
  ): Promise<IForeignKeyWithForeignColumnName> {
    try {
      const [foreignTableSettings, foreignTableStructure] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, foreignKey.referenced_table_name),
        dao.getTableStructure(foreignKey.referenced_table_name, userId),
      ]);

      let columnNames = foreignTableStructure.map((el) => {
        return el.column_name;
      });
      if (foreignTableSettings && foreignTableSettings.autocomplete_columns.length > 0) {
        columnNames = columnNames.filter((el) => {
          const index = foreignTableSettings.autocomplete_columns.indexOf(el);
          return index >= 0;
        });
      }
      return {
        ...foreignKey,
        autocomplete_columns: columnNames,
      };
    } catch (e) {
      return {
        ...foreignKey,
        autocomplete_columns: [],
      };
    }
  }
}
