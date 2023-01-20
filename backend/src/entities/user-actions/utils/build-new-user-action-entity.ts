import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserActionEntity } from '../user-action.entity.js';
import { UserActionEnum } from '../../../enums/index.js';

export function buildNewUserActionEntity(actionData: CreateUserActionDs, user: UserEntity): UserActionEntity {
  const { message } = actionData;
  const newUserAction = new UserActionEntity();
  newUserAction.user = user;
  newUserAction.message = message;
  return newUserAction;
}

export function buildNewConnectionNotFinishedEmailSentAction(user: UserEntity): UserActionEntity {
  const newUserAction = new UserActionEntity();
  newUserAction.user = user;
  newUserAction.message = UserActionEnum.CONNECTION_CREATION_NOT_FINISHED;
  newUserAction.mail_sent = true;
  return newUserAction;
}
