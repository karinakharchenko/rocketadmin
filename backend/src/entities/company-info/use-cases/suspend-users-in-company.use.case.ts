import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SuspendUsersInCompanyDS } from '../application/data-structures/suspend-users-in-company.ds.js';
import { ISuspendUsersInCompany } from './company-info-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable({ scope: Scope.REQUEST })
export class SuspendUsersInCompanyUseCase
  extends AbstractUseCase<SuspendUsersInCompanyDS, SuccessResponse>
  implements ISuspendUsersInCompany
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
  ) {
    super();
  }

  protected async implementation(inputData: SuspendUsersInCompanyDS): Promise<SuccessResponse> {
    const { companyInfoId } = inputData;
    const usersEmails = inputData.usersEmails.map((email) => email.toLowerCase());
    const foundCompany = await this._dbContext.companyInfoRepository.findCompanyInfoWithUsersById(companyInfoId);
    if (!foundCompany) {
      throw new NotFoundException(Messages.COMPANY_NOT_FOUND);
    }
    const userIdsToSuspend = foundCompany.users
      .filter((user) => usersEmails.includes(user.email.toLowerCase()))
      .map((user) => user.id);

    if (!userIdsToSuspend.length) {
      throw new BadRequestException(Messages.NO_USERS_TO_SUSPEND);
    }

    const currentUnsuspendUsersInCompany = foundCompany.users.filter((user) => !user.suspended);
    const isUnsuspendUserLeft = currentUnsuspendUsersInCompany.length - userIdsToSuspend.length <= 0;

    if (isUnsuspendUserLeft) {
      throw new BadRequestException(Messages.CANNOT_SUSPEND_LAST_USER);
    }

    if (isSaaS()) {
      const { success } = await this.saasCompanyGatewayService.suspendUsersInCompany(companyInfoId, userIdsToSuspend);
      if (!success) {
        throw new InternalServerErrorException(Messages.SAAS_SUSPEND_USERS_FAILED_UNHANDLED_ERROR);
      }
    }
    await this._dbContext.userRepository.suspendUsers(userIdsToSuspend);
    return {
      success: true,
    };
  }
}
