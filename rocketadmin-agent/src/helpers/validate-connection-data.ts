import { Messages } from '../text/messages';
import { ICLIConnectionCredentials } from '../interfaces/interfaces';
import { ConnectionTypeEnum } from '../enums';

export function validateConnectionData(connectionData: ICLIConnectionCredentials): Array<string> {
  const errors = [];

  function validateConnectionType(type: string): string {
    return Object.keys(ConnectionTypeEnum).find((key) => key === type);
  }

  if (!validateConnectionType(connectionData.type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
  if (!connectionData.type) errors.push(Messages.TYPE_MISSING);
  if (!connectionData.host) errors.push(Messages.HOST_MISSING);
  if (connectionData.port < 0 || connectionData.port > 65535 || !connectionData.port)
    errors.push(Messages.PORT_MISSING);
  if (typeof connectionData.port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
  if (typeof connectionData.ssl !== 'boolean') errors.push(Messages.SSH_FORMAT_INCORRECT);
  if (!connectionData.username) errors.push(Messages.USERNAME_MISSING);
  if (!connectionData.database) errors.push(Messages.DATABASE_MISSING);
  if (!connectionData.token) errors.push(Messages.CONNECTION_TOKEN_MISSING);
  return errors;
}
