import { Repository } from 'typeorm';
import { IAgentRepository } from '../../entities/agent/repository/agent.repository.interface.js';
import { IConnectionPropertiesRepository } from '../../entities/connection-properties/repository/connection-properties.repository.interface.js';
import { IConnectionRepository } from '../../entities/connection/repository/connection.repository.interface.js';
import { ICustomFieldsRepository } from '../../entities/custom-field/repository/custom-fields-repository.interface.js';
import { IEmailVerificationRepository } from '../../entities/email/repository/email-verification.repository.interface.js';
import { IGroupRepository } from '../../entities/group/repository/group.repository.interface.js';
import { ILogOutRepository } from '../../entities/log-out/repository/log-out-repository.interface.js';
import { IPermissionRepository } from '../../entities/permission/repository/permission.repository.interface.js';
import { ITableActionRepository } from '../../entities/table-actions/repository/table-action-custom-repository.interface.js';
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

export interface IGlobalDatabaseContext extends IDatabaseContext {
  userRepository: IUserRepository;
  connectionRepository: IConnectionRepository;
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
  tableActionRepository: ITableActionRepository;
  userGitHubIdentifierRepository: IUserGitHubIdentifierRepository;
  companyInfoRepository: Repository<CompanyInfoEntity> & ICompanyInfoRepository;
  invitationInCompanyRepository: Repository<InvitationInCompanyEntity> & IInvitationInCompanyRepository;
}
