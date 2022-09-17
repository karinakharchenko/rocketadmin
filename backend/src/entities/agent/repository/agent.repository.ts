import { EntityRepository, getRepository, Repository } from 'typeorm';
import { AgentEntity } from '../agent.entity';
import { IAgentRepository } from './agent.repository.interface';
import { ConnectionEntity } from '../../connection/connection.entity';
import { nanoid } from 'nanoid';

@EntityRepository(AgentEntity)
export class AgentRepository extends Repository<AgentEntity> implements IAgentRepository {
  constructor() {
    super();
  }

  async saveNewAgent(agent: AgentEntity): Promise<AgentEntity> {
    return await this.save(agent);
  }

  async createNewAgentForConnectionAndReturnToken(connection: ConnectionEntity): Promise<string> {
    const newAgent = await this.createNewAgentForConnection(connection);
    return newAgent.token;
  }

  public async createNewAgentForConnection(connection: ConnectionEntity): Promise<AgentEntity> {
    const agent = new AgentEntity();
    const token = nanoid(64);
    if (process.env.NODE_ENV !== 'test') {
      agent.token = token;
    } else {
      agent.token = '_ueF-9gQ4Kv1YVITBn0W_Hzvr5tBBSRmhLEZv2IcejomK2LGBhaFkEzOSB3FvFDW';
    }
    agent.connection = connection;
    const savedAgent = await this.save(agent);
    savedAgent.token = token;
    return savedAgent;
  }

  async renewOrCreateConnectionToken(connectionId: string): Promise<string> {
    const agentQb = await getRepository(AgentEntity)
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    const foundAgent = await agentQb.getOne();
    if (!foundAgent) {
      const connectionQb = await getRepository(ConnectionEntity)
        .createQueryBuilder('connection')
        .andWhere('connection.id = :connectionId', { connectionId: connectionId });
      const foundConnection = await connectionQb.getOne();
      return await this.createNewAgentForConnectionAndReturnToken(foundConnection);
    } else {
      const newToken = nanoid(64);
      foundAgent.token = newToken;
      await this.save(foundAgent);
      return newToken;
    }
  }
}
