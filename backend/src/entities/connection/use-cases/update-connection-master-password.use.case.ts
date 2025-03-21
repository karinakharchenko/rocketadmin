import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { UpdateMasterPasswordDs } from '../application/data-structures/update-master-password.ds.js';
import { IUpdateMasterPassword } from './use-cases.interfaces.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';

@Injectable()
export class UpdateConnectionMasterPasswordUseCase
  extends AbstractUseCase<UpdateMasterPasswordDs, SuccessResponse>
  implements IUpdateMasterPassword
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateMasterPasswordDs): Promise<SuccessResponse> {
    const { connectionId, newMasterPwd, oldMasterPwd } = inputData;
    let connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, oldMasterPwd);
    connection = Encryptor.encryptConnectionCredentials(connection, newMasterPwd);
    connection.master_hash = await Encryptor.hashUserPassword(newMasterPwd);
    const updatedConnection = await this._dbContext.connectionRepository.saveNewConnection(connection);
    return { success: !!updatedConnection };
  }
}
