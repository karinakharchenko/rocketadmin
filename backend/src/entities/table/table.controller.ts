import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TableService } from './table.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddRowDto } from './dto/add-row-dto';
import { AmplitudeEventTypeEnum } from '../../enums';
import { DeleteRowDto } from './dto/delete-row-dto';
import { FindTableDto } from './dto/find-table.dto';
import { IRequestWithCognitoInfo } from '../../authorization';
import { getCognitoUserName, getMasterPwd, isObjectEmpty } from '../../helpers';
import { IStructureRO, ITableRowRO } from './table.interface';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { UpdateRowDto } from './dto/update-row-dto';
import { TableAddGuard, TableDeleteGuard, TableEditGuard, TableReadGuard } from '../../guards';
import { AmplitudeService } from '../amplitude/amplitude.service';
import { UseCaseType } from '../../common/data-injection.tokens';
import {
  IAddRowInTable,
  IFindTablesInConnection,
  IGetTableRows,
  IGetTableStructure,
  IUpdateRowInTable,
} from './use-cases/table-use-cases.interface';
import { FindTablesDs } from './application/data-structures/find-tables.ds';
import { FoundTableDs } from './application/data-structures/found-table.ds';
import { GetTableRowsDs } from './application/data-structures/get-table-rows.ds';
import { FoundTableRowsDs } from './application/data-structures/found-table-rows.ds';
import { GetTableStructureDs } from './application/data-structures/get-table-structure-ds';
import { AddRowInTableDs } from './application/data-structures/add-row-in-table.ds';
import { UpdateRowInTableDs } from './application/data-structures/update-row-in-table.ds';

@ApiBearerAuth()
@ApiTags('tables')
@UseInterceptors(SentryInterceptor)
@Controller()
export class TableController {
  constructor(
    private readonly tableService: TableService,
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
  ) {}

  @ApiOperation({ summary: 'Get tables in connection' })
  @ApiResponse({
    status: 200,
    description: 'Return tables in current connection',
  })
  @Get('/connection/tables/:slug')
  async findTablesInConnection(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Query('hidden') hidden_tables: string,
  ): Promise<Array<FoundTableDs>> {
    const hiddenTablesOption = hidden_tables === 'true';
    const connectionId = params.slug;
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const inputData: FindTablesDs = {
      connectionId: connectionId,
      hiddenTablesOption: hiddenTablesOption,
      masterPwd: masterPwd,
      userId: cognitoUserName,
    };
    return await this.findTablesInConnectionUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Get all rows in table in this connection' })
  @ApiResponse({ status: 200, description: 'Return all rows in this table' })
  @ApiBody({ type: FindTableDto })
  @UseGuards(TableReadGuard)
  @Get('/table/rows/:slug')
  async findAllRows(
    @Req() request: IRequestWithCognitoInfo,
    @Query('tableName') tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @Param() params,
  ): Promise<FoundTableRowsDs> {
    const connectionID = params.slug;
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionID) {
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
    const masterPwd = getMasterPwd(request);
    const inputData: GetTableRowsDs = {
      connectionId: connectionID,
      masterPwd: masterPwd,
      page: page,
      perPage: perPage,
      query: query,
      searchingFieldValue: searchingFieldValue,
      tableName: tableName,
      userId: cognitoUserName,
    };
    return await this.getTableRowsUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Get structure of this table in this connection' })
  @ApiResponse({
    status: 200,
    description: 'Return structure of this table in this connection',
  })
  @UseGuards(TableReadGuard)
  @Get('/table/structure/:slug')
  async getTableStructure(
    @Req() request: IRequestWithCognitoInfo,
    @Query('tableName') tableName: string,
    @Param() params,
  ): Promise<IStructureRO> {
    const connectionId = params.slug;
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const inputData: GetTableStructureDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: cognitoUserName,
    };
    return await this.getTableStructureUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Insert values into table' })
  @ApiResponse({ status: 200, description: 'Values successfully inserted' })
  @ApiBody({ type: AddRowDto })
  @UseGuards(TableAddGuard)
  @Post('/table/row/:slug')
  async addRowInTable(
    @Req() request: IRequestWithCognitoInfo,
    @Body() body: string,
    @Query() query: string,
    @Param() params,
  ): Promise<ITableRowRO | boolean> {
    const tableName = query['tableName'];
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    if (!connectionId || !tableName || isObjectEmpty(body)) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const inputData: AddRowInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      row: body as unknown as Record<string, unknown>,
      tableName: tableName,
      userId: cognitoUserName,
    };
    return await this.addRowInTableUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Update values into table (by "id" in row)' })
  @ApiResponse({ status: 200, description: 'Values successfully updated' })
  @ApiBody({ type: UpdateRowDto })
  @UseGuards(TableEditGuard)
  @Put('/table/row/:slug')
  async updateRowInTable(
    @Req() request: IRequestWithCognitoInfo,
    @Body() body: string,
    @Param() params,
    @Query() query: string,
  ): Promise<ITableRowRO> {
    const tableName = query['tableName'];
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    if (!connectionId || !tableName || !body) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const primaryKeys = await this.getPrimaryKeys(cognitoUserName, connectionId, tableName, query, masterPwd);
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
      userId: cognitoUserName,
    };
    return await this.updateRowInTableUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Delete row in table' })
  @ApiResponse({ status: 200, description: 'Row deleted' })
  @ApiBody({ type: DeleteRowDto })
  @UseGuards(TableDeleteGuard)
  @Delete('/table/row/:slug')
  async deleteRowInTable(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Query() query: string,
  ): Promise<{ deletedRowPrimaryKey: number } | { deleted: boolean }> {
    const masterPwd = getMasterPwd(request);
    const connectionID = params.slug;
    const tableName = query['tableName'];
    const cognitoUserName = getCognitoUserName(request);
    const primaryKeys = await this.getPrimaryKeys(cognitoUserName, connectionID, tableName, query, masterPwd);
    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });
    const primaryKey = Object.fromEntries(propertiesArray);

    if (!connectionID || !tableName || !primaryKey) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.tableService.deleteRowInTable(cognitoUserName, connectionID, tableName, primaryKey, masterPwd);
  }

  @ApiOperation({ summary: 'Get row by primary key' })
  @ApiResponse({ status: 200, description: 'Return a row' })
  @UseGuards(TableReadGuard)
  @Get('/table/row/:slug')
  async getRowByPrimaryKey(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Query() query: string,
  ): Promise<ITableRowRO> {
    const masterPwd = getMasterPwd(request);
    const connectionId = params.slug;
    const tableName = query['tableName'];
    const cognitoUserName = getCognitoUserName(request);
    const primaryKeys = await this.getPrimaryKeys(cognitoUserName, connectionId, tableName, query, masterPwd);

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
    try {
      return await this.tableService.getRowByPrimaryKey(
        request.decoded.sub,
        connectionId,
        tableName,
        primaryKey,
        masterPwd,
        true,
      );
    } catch (e) {
      throw e;
    } finally {
      const isTest = await this.tableService.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowReceivedTest : AmplitudeEventTypeEnum.tableRowReceived,
        cognitoUserName,
      );
    }
  }

  private async getPrimaryKeys(
    cognitoUserName: string,
    connectionID: string,
    tableName: string,
    query: string,
    masterPwd: string,
  ): Promise<Array<any>> {
    const primaryKeys = [];
    const { primaryColumns } = await this.tableService.getTableStructure(
      cognitoUserName,
      connectionID,
      tableName,
      masterPwd,
    );

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
