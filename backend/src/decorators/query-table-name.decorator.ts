import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { buildBadRequestException } from 'src/guards/utils';
import { IRequestWithCognitoInfo } from '../authorization';
import { Messages } from '../exceptions/text/messages';

export const QueryTableName = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const query = request.query;
  if (query.hasOwnProperty('tableName')) {
    return query['tableName'];
  }
  throw buildBadRequestException(Messages.TABLE_NAME_MISSING);
});
