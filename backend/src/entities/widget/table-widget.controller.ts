import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateTableWidgetsDs } from './application/data-sctructures/create-table-widgets.ds.js';
import { FindTableWidgetsDs } from './application/data-sctructures/find-table-widgets.ds.js';
import { FoundTableWidgetsDs } from './application/data-sctructures/found-table-widgets.ds.js';
import { CreateOrUpdateTableWidgetsDto, CreateTableWidgetDto } from './dto/index.js';
import { ITableWidgetRO } from './table-widget.interface.js';
import { ICreateUpdateDeleteTableWidgets, IFindTableWidgets } from './use-cases/table-widgets-use-cases.interface.js';

@ApiBearerAuth()
@ApiTags('table_widgets')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class TableWidgetController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_WIDGETS)
    private readonly findTableWidgetsUseCase: IFindTableWidgets,
    @Inject(UseCaseType.CREATE_UPDATE_DELETE_TABLE_WIDGETS)
    private readonly createUpdateDeleteTableWidgetsUseCase: ICreateUpdateDeleteTableWidgets,
  ) {}

  @ApiOperation({ summary: 'Get all table widgets' })
  @ApiResponse({ status: 200, description: 'Return all table widgets' })
  @UseGuards(ConnectionReadGuard)
  @Get('/widgets/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Param() params,
    @QueryTableName() tableName: string,
  ): Promise<Array<ITableWidgetRO>> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputData: FindTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
    };
    return await this.findTableWidgetsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Create new table widget' })
  @ApiResponse({ status: 201, description: 'Return table settings with created table widget' })
  @ApiBody({ type: CreateOrUpdateTableWidgetsDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/widget/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async createOrUpdateTableWidgets(
    @QueryTableName() tableName: string,
    @Body('widgets') widgets: Array<CreateTableWidgetDto>,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<Array<FoundTableWidgetsDs>> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreateTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
      widgets: widgets,
    };
    return await this.createUpdateDeleteTableWidgetsUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
