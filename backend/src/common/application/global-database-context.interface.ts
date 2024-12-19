import { Repository } from 'typeorm';
import { IAgentRepository } from '../../entities/agent/repository/agent.repository.interface.js';
import { IConnectionPropertiesRepository } from '../../entities/connection-properties/repository/connection-properties.repository.interface.js';
import { IConnectionRepository } from '../../entities/connection/repository/connection.repository.interface.js';
import { ICustomFieldsRepository } from '../../entities/custom-field/repository/custom-fields-repository.interface.js';
import { IEmailVerificationRepository } from '../../entities/email/repository/email-verification.repository.interface.js';
import { IGroupRepository } from '../../entities/group/repository/group.repository.interface.js';
import { ILogOutRepository } from '../../entities/log-out/repository/log-out-repository.interface.js';
import { IPermissionRepository } from '../../entities/permission/repository/permission.repository.interface.js';
import { ITableActionRepository } from '../../entities/table-actions/table-actions-module/repository/table-action-custom-repository.interface.js';
import { TableFieldInfoEntity } from '../../entities/table-field-info/table-field-info.entity.js';
import { TableInfoEntity } from '../../entities/table-info/table-info.entity.js';
import { ITableLogsRepository } from '../../entities/table-logs/repository/table-logs-repository.interface.js';
import { ITableSettingsRepository } from '../../entities/table-settings/repository/table-settings.repository.interface.js';
import { IUserAccessRepository } from '../../entities/user-access/repository/user-access.repository.interface.js';
import { IUserActionRepository } from '../../entities/user-actions/repository/user-action.repository.interface.js';
import { IUserRepository } from '../../entities/user/repository/user.repository.interface.js';
import { IEmailChangeRepository } from '../../entities/user/user-email/repository/email-change.repository.interface.js';
import { IUserInvitationRepository } from '../../entities/user/user-invitation/repository/user-invitation-repository.interface.js';
import { IPasswordResetRepository } from '../../entities/user/user-password/repository/password-reset-repository.interface.js';
import { ITableWidgetsRepository } from '../../entities/widget/repository/table-widgets-repository.interface.js';
import { IDatabaseContext } from '../database-context.interface.js';
import { IUserGitHubIdentifierRepository } from '../../entities/user/user-github-identifier/repository/user-github-identifier-repository.interface.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import { ICompanyInfoRepository } from '../../entities/company-info/repository/company-info-repository.interface.js';
import { InvitationInCompanyEntity } from '../../entities/company-info/invitation-in-company/invitation-in-company.entity.js';
import { IInvitationInCompanyRepository } from '../../entities/company-info/invitation-in-company/repository/invitation-repository.interface.js';
import { IUserSessionSettings } from '../../entities/user/user-session-settings/reposiotory/user-session-settings-repository.interface.js';
import { UserSessionSettingsEntity } from '../../entities/user/user-session-settings/user-session-settings.entity.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { ActionRulesEntity } from '../../entities/table-actions/table-action-rules-module/action-rules.entity.js';
import { IActionRulesRepository } from '../../entities/table-actions/table-action-rules-module/repository/action-rules-custom-repository.interface.js';
import { IActionEventsRepository } from '../../entities/table-actions/table-action-events-module/repository/action-events-custom-repository.interface.js';
import { UserApiKeyEntity } from '../../entities/api-key/api-key.entity.js';
import { IUserApiKeyRepository } from '../../entities/api-key/repository/user-api-key-repository.interface.js';
import { ActionEventsEntity } from '../../entities/table-actions/table-action-events-module/action-event.entity.js';
import { TableActionEntity } from '../../entities/table-actions/table-actions-module/table-action.entity.js';
import { IAiUserThreadsRepository } from '../../entities/ai/ai-data-entities/ai-user-threads/ai-user-threads-repository.interface.js';
import { AiUserThreadEntity } from '../../entities/ai/ai-data-entities/ai-user-threads/ai-user-threads.entity.js';
import { IAiUserFilesRepository } from '../../entities/ai/ai-data-entities/ai-user-files/ai-user-files-repository.interface.js';
import { AiUserFileEntity } from '../../entities/ai/ai-data-entities/ai-user-files/ai-user-files.entity.js';

export interface IGlobalDatabaseContext extends IDatabaseContext {
  userRepository: Repository<UserEntity> & IUserRepository;
  connectionRepository: Repository<ConnectionEntity> & IConnectionRepository;
  groupRepository: IGroupRepository;
  permissionRepository: IPermissionRepository;
  tableSettingsRepository: ITableSettingsRepository;
  userAccessRepository: IUserAccessRepository;
  agentRepository: IAgentRepository;
  emailVerificationRepository: IEmailVerificationRepository;
  passwordResetRepository: IPasswordResetRepository;
  emailChangeRepository: IEmailChangeRepository;
  userInvitationRepository: IUserInvitationRepository;
  connectionPropertiesRepository: IConnectionPropertiesRepository;
  customFieldsRepository: ICustomFieldsRepository;
  tableLogsRepository: ITableLogsRepository;
  userActionRepository: IUserActionRepository;
  logOutRepository: ILogOutRepository;
  tableWidgetsRepository: ITableWidgetsRepository;
  tableInfoRepository: Repository<TableInfoEntity>;
  tableFieldInfoRepository: Repository<TableFieldInfoEntity>;
  tableActionRepository: Repository<TableActionEntity> & ITableActionRepository;
  userGitHubIdentifierRepository: IUserGitHubIdentifierRepository;
  companyInfoRepository: Repository<CompanyInfoEntity> & ICompanyInfoRepository;
  invitationInCompanyRepository: Repository<InvitationInCompanyEntity> & IInvitationInCompanyRepository;
  userSessionSettingsRepository: Repository<UserSessionSettingsEntity> & IUserSessionSettings;
  actionRulesRepository: Repository<ActionRulesEntity> & IActionRulesRepository;
  actionEventsRepository: Repository<ActionEventsEntity> & IActionEventsRepository;
  userApiKeysRepository: Repository<UserApiKeyEntity> & IUserApiKeyRepository;
  aiUserThreadsRepository: Repository<AiUserThreadEntity> & IAiUserThreadsRepository;
  aiUserFilesRepository: Repository<AiUserFileEntity> & IAiUserFilesRepository;
}
