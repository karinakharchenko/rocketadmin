import { Body, Controller, HttpException, HttpStatus, Inject, Injectable, Post, UseInterceptors } from '@nestjs/common';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { UserId } from '../../decorators/index.js';
import { InTransactionEnum, UserActionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateUserActionDs } from './application/data-sctructures/create-user-action.ds.js';
import { ICreateUserAction } from './use-cases/use-cases-interfaces.js';
import { UserActionEntity } from './user-action.entity.js';

@UseInterceptors(SentryInterceptor)
@Injectable()
@Controller()
export class UserActionController {
  constructor(
    @Inject(UseCaseType.CREATE_USER_ACTION)
    private readonly createUserActionUseCase: ICreateUserAction,
  ) {}

  @Post('action')
  async createUserAction(
    @Body('message') message: UserActionEnum,
    @UserId() userId: string,
  ): Promise<Omit<UserActionEntity, 'user'>> {
    if (!userId || !message) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!validateStringWithEnum(message, UserActionEnum)) {
      throw new HttpException(
        {
          message: Messages.USER_ACTION_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const actionData: CreateUserActionDs = {
      message: message,
      userId: userId,
    };
    return await this.createUserActionUseCase.execute(actionData, InTransactionEnum.ON);
  }
}
