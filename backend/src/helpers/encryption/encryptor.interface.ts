import { UserEntity } from '../../entities/user/user.entity.js';
import { TableLogsEntity } from '../../entities/table-logs/table-logs.entity.js';
import { GroupEntity } from '../../entities/group/group.entity.js';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity.js';
import { AgentEntity } from '../../entities/agent/agent.entity.js';
import { ConnectionPropertiesEntity } from '../../entities/connection-properties/connection-properties.entity.js';
import { TableInfoEntity } from '../../entities/table-info/table-info.entity.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import { TableTriggersEntity } from '../../entities/table-triggers/table-triggers.entity.js';

export interface IEncryptorInterfaceDTO {
  id: string;
  title?: string;
  masterEncryption: boolean;
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  schema?: string;
  sid?: string;
  createdAt: Date;
  updatedAt: Date;
  ssh?: boolean;
  privateSSHKey?: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  ssl?: boolean;
  cert?: string;
  updateTimestampEncryptCredentials: () => void;
  encryptCredentials: () => void;
  decryptCredentials: () => void;
  author: UserEntity;
  groups: Array<GroupEntity>;
  settings: Array<TableSettingsEntity>;
  logs: Array<TableLogsEntity>;
  agent: AgentEntity;
  isTestConnection?: boolean;
  connection_properties: ConnectionPropertiesEntity;
  tables_info: Array<TableInfoEntity>;
  saved_table_info?: number;
  signing_key: string;
  company: CompanyInfoEntity;
  authSource?: string;
  table_triggers: Array<TableTriggersEntity>
}
