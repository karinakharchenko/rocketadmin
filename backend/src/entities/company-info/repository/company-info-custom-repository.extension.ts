import { CompanyInfoEntity } from '../company-info.entity.js';
import { ICompanyInfoRepository } from './company-info-repository.interface.js';

export const companyInfoRepositoryExtension: ICompanyInfoRepository = {
  async findCompanyInfoWithUsersById(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findCompanyWithInvitationsById(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findOneCompanyInfoByUserIdWithConnections(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.connections', 'connections')
      .where('users.id = :userId', { userId })
      .getOne();
  },

  async finOneCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('users.id = :userId', { userId })
      .getOne();
  },

  async findCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('users.id = :userId', { userId })
      .getOne();
  },

  async findUserCompanyWithUsers(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'current_user')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('current_user.id = :userId', { userId })
      .getOne();
  },

  // returns groups and connections where user is invited
  async findFullCompanyInfoByUserId(userId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'current_user')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.connections', 'connections')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
      .leftJoinAndSelect('connections.groups', 'groups')
      .leftJoinAndSelect('connections.author', 'connection_author')
      .leftJoinAndSelect('groups.users', 'groups_users')
      .where('current_user.id = :userId', { userId })
      .getOne();
  },

  async findFullCompanyInfoByCompanyId(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'current_user')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.connections', 'connections')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
      .leftJoinAndSelect('connections.groups', 'groups')
      .leftJoinAndSelect('connections.author', 'connection_author')
      .leftJoinAndSelect('groups.users', 'groups_users')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findCompanyInfoByCompanyIdWithoutConnections(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'current_user')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('company_info.invitations', 'invitations')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  // temporary solution to handle "old" connections (case, when connection not attached to any company
  // will be removed in during architecture refactoring)
  async findAllCompanyWithConnectionsUsersJoining(companyId: string): Promise<CompanyInfoEntity> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .leftJoinAndSelect('users.groups', 'groups')
      .leftJoinAndSelect('groups.connection', 'connections')
      .leftJoinAndSelect('connections.author', 'connection_author')
      .leftJoinAndSelect('connections.groups', 'connection_groups')
      .leftJoinAndSelect('connection_groups.users', 'connection_groups_users')
      .where('company_info.id = :companyId', { companyId })
      .getOne();
  },

  async findCompanyInfosByUserEmail(userEmail: string): Promise<CompanyInfoEntity[]> {
    return await this.createQueryBuilder('company_info')
      .leftJoinAndSelect('company_info.users', 'users')
      .where('users.email = :userEmail', { userEmail: userEmail?.toLowerCase() })
      .andWhere('users."externalRegistrationProvider" IS NULL')
      .getMany();
  },
};
