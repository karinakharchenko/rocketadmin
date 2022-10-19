import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { AgentModule } from '../agent/agent.module';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { ConnectionEntity } from '../connection/connection.entity';
import { GroupEntity } from '../group/group.entity';
import { LogOutEntity } from '../log-out/log-out.entity';
import { PermissionEntity } from '../permission/permission.entity';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import { UserEntity } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { CustomFieldController } from './custom-field.controller';
import { CustomFieldsEntity } from './custom-fields.entity';
import { CreateCustomFieldsUseCase } from './use-cases/create-custom-fields.use.case';
import { DeleteCustomFieldUseCase } from './use-cases/delete-custom-field.use.case';
import { GetCustomFieldsUseCase } from './use-cases/get-custom-fields.use.case';
import { UpdateCustomFieldUseCase } from './use-cases/update-custom-field.use.case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConnectionEntity,
      CustomFieldsEntity,
      GroupEntity,
      PermissionEntity,
      TableLogsEntity,
      TableSettingsEntity,
      TableWidgetEntity,
      UserEntity,
      ConnectionPropertiesEntity,
      LogOutEntity,
    ]),
    AgentModule,
    UserModule,
  ],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.GET_CUSTOM_FIELDS,
      useClass: GetCustomFieldsUseCase,
    },
    {
      provide: UseCaseType.CREATE_CUSTOM_FIELDS,
      useClass: CreateCustomFieldsUseCase,
    },
    {
      provide: UseCaseType.UPDATE_CUSTOM_FIELDS,
      useClass: UpdateCustomFieldUseCase,
    },
    {
      provide: UseCaseType.DELETE_CUSTOM_FIELD,
      useClass: DeleteCustomFieldUseCase,
    },
  ],
  controllers: [CustomFieldController],
  exports: [],
})
export class CustomFieldModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/fields/:slug', method: RequestMethod.GET },
        { path: '/field/:slug', method: RequestMethod.POST },
        { path: '/field/:slug', method: RequestMethod.PUT },
        { path: '/field/:slug', method: RequestMethod.DELETE },
      );
  }
}
