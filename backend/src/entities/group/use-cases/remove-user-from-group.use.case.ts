import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, DynamicModuleEnum } from '../../../common/data-injection.tokens.js';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { IStripeSerice } from '../../stripe/application/interfaces/stripe-service.interface.js';
import { AddUserInGroupDs } from '../application/data-sctructures/add-user-in-group.ds.js';
import { RemoveUserFromGroupResultDs } from '../application/data-sctructures/remove-user-from-group-result.ds.js';
import { buildRemoveUserFromGroupResultDs } from '../utils/build-remove-user-from-group-result.ds.js';
import { IRemoveUserFromGroup } from './use-cases.interfaces.js';

@Injectable()
export class RemoveUserFromGroupUseCase
  extends AbstractUseCase<AddUserInGroupDs, RemoveUserFromGroupResultDs>
  implements IRemoveUserFromGroup
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeSerice,
  ) {
    super();
  }

  protected async implementation(inputData: AddUserInGroupDs): Promise<RemoveUserFromGroupResultDs> {
    const { groupId, email } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserByEmail(email);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const groupToUpdate = await this._dbContext.groupRepository.findGroupById(groupId);
    if (groupToUpdate.isMain && groupToUpdate.users.length <= 1) {
      throw new HttpException(
        {
          message: Messages.CANT_DELETE_LAST_USER,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const usersArray = groupToUpdate.users;
    const delIndex = usersArray
      .map(function (e) {
        return e.id;
      })
      .indexOf(foundUser.id);
    groupToUpdate.users.splice(delIndex, 1);
    const ownerId = await this._dbContext.connectionRepository.getConnectionAuthorIdByGroupInConnectionId(groupId);
    const updatedGroup = await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
    const foundOwner = await this._dbContext.userRepository.findOneUserById(ownerId);
    const ownerSubscriptionLevel: SubscriptionLevelEnum = await this.stripeService.getCurrentUserSubscription(
      foundOwner.stripeId,
    );
    // eslint-disable-next-line prefer-const
    let { usersInConnections, usersInConnectionsCount } =
      await this._dbContext.connectionRepository.calculateUsersInAllConnectionsOfThisOwner(ownerId);

    const userStayInConnection = !!usersInConnections.find((userInConnection) => {
      return userInConnection.id === foundUser.id;
    });

    if (!userStayInConnection) {
      --usersInConnectionsCount;
      await this.stripeService.createStripeUsageRecord(
        ownerSubscriptionLevel,
        usersInConnectionsCount,
        foundOwner.stripeId,
      );
    }

    return buildRemoveUserFromGroupResultDs(updatedGroup);
  }
}
