import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';

import { ConnectionEntity } from '../connection/connection.entity.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';

@Entity('agent')
export class AgentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  encryptToken(): void {
    this.token = Encryptor.hashDataHMAC(this.token);
  }

  @BeforeUpdate()
  updateTimestampAndEncryptToken(): void {
    this.updatedAt = new Date();
    this.token = Encryptor.hashDataHMAC(this.token);
  }

  @OneToOne(() => ConnectionEntity, (connection) => connection.agent, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection: Relation<ConnectionEntity>;
}
