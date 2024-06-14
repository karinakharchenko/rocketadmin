import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateApiKeyDS } from '../application/data-structures/create-api-key.ds.js';
import { CreatedApiKeyDS } from '../application/data-structures/created-api-key.ds.js';

export interface ICreateApiKey {
  execute(inputData: CreateApiKeyDS, inTransaction: InTransactionEnum): Promise<CreatedApiKeyDS>;
}
