import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { UserEntity } from '../user.entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions.js';
import { buildRegisteredUserDS } from '../utils/build-registered-user.ds.js';
import { buildTestTableSettings } from '../utils/build-test-table-settings.js';
import { generateGwtToken, IToken } from '../utils/generate-gwt-token.js';
import { IFacebookLogin } from './user-use-cases.interfaces.js';

@Injectable()
export class FacebookLoginUseCase extends AbstractUseCase<string, IToken> implements IFacebookLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(facebookAccessToken: string): Promise<IToken> {
    const faceBookGraphApiUrl = `https://graph.facebook.com/me?access_token=${facebookAccessToken}&fields=email,name`;
    try {
      const response = await axios.get(faceBookGraphApiUrl);
      const email = response.data.email;
      const userName = response.data.name ? response.data.name : null;
      if (!email) {
        throw Error('There no email address in user info from facebook');
      }
      const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByEmail(email);
      if (foundUser) {
        if (foundUser.name !== userName && userName) {
          foundUser.name = userName;
          await this._dbContext.userRepository.saveUserEntity(foundUser);
        }
        return generateGwtToken(foundUser);
      }
      const userData: RegisterUserDs = {
        email: email,
        gclidValue: null,
        password: null,
        isActive: true,
        name: userName,
      };
      const savedUser = await this._dbContext.userRepository.saveRegisteringUser(userData);
      const testConnections = Constants.getTestConnectionsArr();
      const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
      const createdTestConnections = await Promise.all(
        testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
          connection.author = savedUser;
          return await this._dbContext.connectionRepository.saveNewConnection(connection);
        }),
      );
      const testGroupsEntities = buildDefaultAdminGroups(savedUser, createdTestConnections);
      const createdTestGroups = await Promise.all(
        testGroupsEntities.map(async (group: GroupEntity) => {
          return await this._dbContext.groupRepository.saveNewOrUpdatedGroup(group);
        }),
      );
      const testPermissionsEntities = buildDefaultAdminPermissions(createdTestGroups);
      await Promise.all(
        testPermissionsEntities.map(async (permission: PermissionEntity) => {
          await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(permission);
        }),
      );
      const testTableSettingsArrays: Array<Array<TableSettingsEntity>> = buildTestTableSettings(createdTestConnections);

      for (const tableSettingsArray of testTableSettingsArrays) {
        await Promise.all(
          tableSettingsArray.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }

      const registeredUser: RegisteredUserDs = buildRegisteredUserDS(savedUser);
      return registeredUser.token;
    } catch (e) {
      console.error('-> e', e);
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
