import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.intarface.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { createDataAccessObject } from '../../data-access-layer/shared/create-data-access-object.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { TableAddGuard, TableDeleteGuard, TableEditGuard, TableReadGuard } from '../../guards/index.js';
import { isConnectionTypeAgent, isObjectEmpty } from '../../helpers/index.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { AddRowInTableDs } from './application/data-structures/add-row-in-table.ds.js';
import { DeleteRowFromTableDs, DeleteRowsFromTableDs } from './application/data-structures/delete-row-from-table.ds.js';
import { DeletedRowFromTableDs } from './application/data-structures/deleted-row-from-table.ds.js';
import { FindTablesDs } from './application/data-structures/find-tables.ds.js';
import { FoundTableRowsDs } from './application/data-structures/found-table-rows.ds.js';
import { FoundTableDs } from './application/data-structures/found-table.ds.js';
import { GetRowByPrimaryKeyDs } from './application/data-structures/get-row-by-primary-key.ds.js';
import { GetTableRowsDs } from './application/data-structures/get-table-rows.ds.js';
import { GetTableStructureDs } from './application/data-structures/get-table-structure-ds.js';
import { UpdateRowInTableDs } from './application/data-structures/update-row-in-table.ds.js';
import { AddRowDto } from './dto/add-row-dto.js';
import { DeleteRowDto } from './dto/delete-row-dto.js';
import { FindTableDto } from './dto/find-table.dto.js';
import { UpdateRowDto } from './dto/update-row-dto.js';
import { IStructureRO, ITableRowRO } from './table.interface.js';
import {
  IAddRowInTable,
  IDeleteRowFromTable,
  IDeleteRowsFromTable,
  IFindTablesInConnection,
  IGetRowByPrimaryKey,
  IGetTableRows,
  IGetTableStructure,
  IUpdateRowInTable,
} from './use-cases/table-use-cases.interface.js';

@ApiBearerAuth()
@ApiTags('tables')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class TableController {
  constructor(
    private readonly amplitudeService: AmplitudeService,
    @Inject(UseCaseType.FIND_TABLES_IN_CONNECTION)
    private readonly findTablesInConnectionUseCase: IFindTablesInConnection,
    @Inject(UseCaseType.GET_ALL_TABLE_ROWS)
    private readonly getTableRowsUseCase: IGetTableRows,
    @Inject(UseCaseType.GET_TABLE_STRUCTURE)
    private readonly getTableStructureUseCase: IGetTableStructure,
    @Inject(UseCaseType.ADD_ROW_IN_TABLE)
    private readonly addRowInTableUseCase: IAddRowInTable,
    @Inject(UseCaseType.UPDATE_ROW_IN_TABLE)
    private readonly updateRowInTableUseCase: IUpdateRowInTable,
    @Inject(UseCaseType.DELETE_ROW_FROM_TABLE)
    private readonly deleteRowFromTableUseCase: IDeleteRowFromTable,
    @Inject(UseCaseType.GET_ROW_BY_PRIMARY_KEY)
    private readonly getRowByPrimaryKeyUseCase: IGetRowByPrimaryKey,
    @Inject(UseCaseType.DELETE_ROWS_FROM_TABLE)
    private readonly deleteRowsFromTableUseCase: IDeleteRowsFromTable,
    @InjectRepository(ConnectionEntity)
    private readonly connectionRepository: Repository<ConnectionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  @ApiOperation({ summary: 'Get tables in connection' })
  @ApiResponse({
    status: 200,
    description: 'Return tables in current connection',
  })
  @Get('/connection/tables/:slug')
  async findTablesInConnection(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Query('hidden') hidden_tables: string,
  ): Promise<Array<FoundTableDs>> {
    const hiddenTablesOption = hidden_tables === 'true';
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindTablesDs = {
      connectionId: connectionId,
      hiddenTablesOption: hiddenTablesOption,
      masterPwd: masterPwd,
      userId: userId,
    };
    return await this.findTablesInConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get all rows in table in this connection' })
  @ApiResponse({ status: 200, description: 'Return all rows in this table' })
  @ApiBody({ type: FindTableDto })
  @UseGuards(TableReadGuard)
  @Get('/table/rows/:slug')
  async findAllRows(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableRowsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (page && perPage) {
      page = parseInt(page);
      perPage = parseInt(perPage);
      if ((page && page <= 0) || (perPage && perPage <= 0)) {
        throw new HttpException(
          {
            message: Messages.PAGE_AND_PERPAGE_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inputData: GetTableRowsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      page: page,
      perPage: perPage,
      query: query,
      searchingFieldValue: searchingFieldValue,
      tableName: tableName,
      userId: userId,
    };
    return await this.getTableRowsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get structure of this table in this connection' })
  @ApiResponse({
    status: 200,
    description: 'Return structure of this table in this connection',
  })
  @UseGuards(TableReadGuard)
  @Get('/table/structure/:slug')
  async getTableStructure(
    @QueryTableName() tableName: string,
    @UserId() userId: string,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<IStructureRO> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: GetTableStructureDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
    };
    return await this.getTableStructureUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Insert values into table' })
  @ApiResponse({ status: 200, description: 'Values successfully inserted' })
  @ApiBody({ type: AddRowDto })
  @UseGuards(TableAddGuard)
  @Post('/table/row/:slug')
  async addRowInTable(
    @Body() body: string,
    @Query() query: string,
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
  ): Promise<ITableRowRO | boolean> {
    if (!connectionId || isObjectEmpty(body)) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: AddRowInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      row: body as unknown as Record<string, unknown>,
      tableName: tableName,
      userId: userId,
    };
    return await this.addRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update values into table (by "id" in row)' })
  @ApiResponse({ status: 200, description: 'Values successfully updated' })
  @ApiBody({ type: UpdateRowDto })
  @UseGuards(TableEditGuard)
  @Put('/table/row/:slug')
  async updateRowInTable(
    @Body() body: string,
    @Query() query: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<ITableRowRO> {
    if (!connectionId || !body) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);
    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });

    const primaryKey = Object.fromEntries(propertiesArray);
    const inputData: UpdateRowInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKey: primaryKey,
      row: body as unknown as Record<string, unknown>,
      tableName: tableName,
      userId: userId,
    };
    return await this.updateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete row in table' })
  @ApiResponse({ status: 200, description: 'Row deleted' })
  @ApiBody({ type: DeleteRowDto })
  @UseGuards(TableDeleteGuard)
  @Delete('/table/row/:slug')
  async deleteRowInTable(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
  ): Promise<DeletedRowFromTableDs> {
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);
    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });
    const primaryKey = Object.fromEntries(propertiesArray);

    if (!connectionId || !tableName || !primaryKey) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteRowFromTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKey: primaryKey,
      tableName: tableName,
      userId: userId,
    };
    return await this.deleteRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete rows in table' })
  @ApiResponse({ status: 200, description: 'Rows deleted' })
  @UseGuards(TableDeleteGuard)
  @Put('/table/rows/delete/:slug')
  async deleteRowsInTable(
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
    @Body() body: Array<Record<string, unknown>>,
  ): Promise<boolean> {
    if (!connectionId || !tableName) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!Array.isArray(body)) {
      throw new HttpException(
        {
          message: Messages.MUST_CONTAIN_ARRAY_OF_PRIMARY_KEYS,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteRowsFromTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKeys: body,
      tableName: tableName,
      userId: userId,
    };
    return await this.deleteRowsFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get row by primary key' })
  @ApiResponse({ status: 200, description: 'Return a row' })
  @UseGuards(TableReadGuard)
  @Get('/table/row/:slug')
  async getRowByPrimaryKey(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
  ): Promise<ITableRowRO> {
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);

    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });
    const primaryKey = Object.fromEntries(propertiesArray);
    if (!connectionId || !primaryKey) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const inputData: GetRowByPrimaryKeyDs = {
        connectionId: connectionId,
        masterPwd: masterPwd,
        primaryKey: primaryKey,
        tableName: tableName,
        userId: userId,
      };
      return await this.getRowByPrimaryKeyUseCase.execute(inputData, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      const isTest = await this._dbContext.connectionRepository.isTestConnectionById(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowReceivedTest : AmplitudeEventTypeEnum.tableRowReceived,
        userId,
      );
    }
  }

  private async getPrimaryKeys(
    userId: string,
    connectionId: string,
    tableName: string,
    query: string,
    masterPwd: string,
  ): Promise<Array<any>> {
    const primaryKeys = [];
    let connection = await this.connectionRepository.findOne({ where: { id: connectionId } });
    if (connection.masterEncryption && masterPwd) {
      connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
    }
    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = (await this.userRepository.findOne({ where: { id: userId } })).email;
    }
    const dao = createDataAccessObject(connection, userEmail);
    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);

    for (const primaryColumn of primaryColumns) {
      let property = {};
      if (primaryColumn.hasOwnProperty('column_name')) {
        property = {
          [primaryColumn.column_name]: query[primaryColumn.column_name],
        };
      }
      primaryKeys.push(property);
    }
    return primaryKeys;
  }
}
