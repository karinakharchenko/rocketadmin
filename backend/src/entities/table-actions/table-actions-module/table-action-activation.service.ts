import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../user/user.entity.js';
import { TableActionEntity } from './table-action.entity.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { actionSlackPostMessage } from '../../../helpers/slack/action-slack-post-message.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { getProcessVariable } from '../../../helpers/get-process-variable.js';
import { IMessage } from '../../email/email/email.interface.js';
import { sendEmailToUser } from '../../email/send-email.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import axios, { AxiosResponse } from 'axios';
import PQueue from 'p-queue';
import { isSaaS } from '../../../helpers/app/is-saas.js';

export type ActionActivationResult = {
  location?: string;
  receivedOperationResult: OperationResultStatusEnum;
  receivedPrimaryKeysObj: Array<Record<string, unknown>>;
};

type MessageContent = {
  text: string;
  html: string;
};

type UserInfoMessageData = {
  userId: string;
  email: string;
  userName: string;
};

@Injectable()
export class TableActionActivationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  public async activateTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userId: string,
    tableName: string,
    triggerOperation: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    const userInfoMessageData: UserInfoMessageData = {
      userId,
      email: foundUser.email,
      userName: foundUser.name,
    };
    switch (tableAction.method) {
      case TableActionMethodEnum.URL:
        return await this.activateHttpTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
        );
      case TableActionMethodEnum.SLACK:
        return await this.activateSlackTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
          triggerOperation,
        );
      case TableActionMethodEnum.EMAIL:
        return await this.activateEmailTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
          triggerOperation,
        );
      default:
        throw new Error(`Method ${tableAction.method} is not supported`);
    }
  }

  public async activateSlackTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
    triggerOperation?: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    let operationResult = OperationResultStatusEnum.unknown;
    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );

    const { text: slackMessage } = this.generateMessageContent(
      userInfo,
      triggerOperation,
      tableName,
      primaryKeyValuesArray,
    );

    try {
      await actionSlackPostMessage(slackMessage, tableAction.slack_url);
      operationResult = OperationResultStatusEnum.successfully;
    } catch (_e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
    }
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }

  public async activateEmailTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
    triggerOperation: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    let operationResult = OperationResultStatusEnum.unknown;
    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );
    const { text, html } = this.generateMessageContent(userInfo, triggerOperation, tableName, primaryKeyValuesArray);

    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;

    const queue = new PQueue({ concurrency: 2 });
    try {
      await Promise.all(
        tableAction.emails.map((email) =>
          queue.add(() => {
            const letterContent: IMessage = {
              from: emailFrom,
              to: email,
              subject: 'Rocketadmin action notification',
              text: text,
              html: html,
            };
            return sendEmailToUser(letterContent);
          }),
        ),
      );
      operationResult = OperationResultStatusEnum.successfully;
      return {
        receivedOperationResult: operationResult,
        receivedPrimaryKeysObj: primaryKeyValuesArray,
      };
    } catch (_error) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      return {
        receivedOperationResult: operationResult,
        receivedPrimaryKeysObj: primaryKeyValuesArray,
      };
    }
  }

  public async activateHttpTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
  ): Promise<ActionActivationResult> {
    const { userId } = userInfo;
    let operationResult = OperationResultStatusEnum.unknown;

    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );

    const dateString = new Date().toISOString();
    const actionRequestBody = JSON.stringify({
      $$_raUserId: userId,
      primaryKeys: primaryKeyValuesArray,
      $$_date: dateString,
      $$_actionId: tableAction.id,
      $$_tableName: tableName,
    });
    const autoadminSignatureHeader = Encryptor.hashDataHMACexternalKey(foundConnection.signing_key, actionRequestBody);

    let result: AxiosResponse<any, any>;
    try {
      result = await axios.post(tableAction.url, actionRequestBody, {
        headers: { 'Rocketadmin-Signature': autoadminSignatureHeader, 'Content-Type': 'application/json' },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status <= 599;
        },
      });
      if (!isSaaS()) {
        console.info('HTTP action result data', result.data);
        console.info('HTTP action result status', result.status);
        console.info('HTTP action result headers', result.headers);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          result?.data?.error ||
          result?.data?.message ||
          result?.data?.errorMessage ||
          result?.data?.response ||
          'An error occurred';
        const responseStatus = error.response?.status || result?.status || 500;
        throw new HttpException(
          {
            message: errorMessage,
          },
          responseStatus,
        );
      }
      throw error;
    }
    const operationStatusCode = result.status;
    if (operationStatusCode >= 200 && operationStatusCode < 300) {
      operationResult = OperationResultStatusEnum.successfully;
      return {
        receivedOperationResult: operationResult,
        receivedPrimaryKeysObj: primaryKeyValuesArray,
      };
    }
    if (operationStatusCode >= 300 && operationStatusCode < 400) {
      operationResult = OperationResultStatusEnum.successfully;
      return {
        receivedOperationResult: operationResult,
        location: result?.headers?.location,
        receivedPrimaryKeysObj: primaryKeyValuesArray,
      };
    }
    if (operationStatusCode >= 400 && operationStatusCode <= 599) {
      const errorMessage =
        result?.data?.error ||
        result?.data?.message ||
        result?.data?.errorMessage ||
        result?.data?.response ||
        'An error occurred';
      throw new HttpException(
        {
          message: errorMessage,
        },
        operationStatusCode,
      );
    }
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }

  public async activateTableActions(
    tableActions: Array<TableActionEntity>,
    connection: ConnectionEntity,
    request_body: Record<string, unknown>,
    userId: string,
    tableName: string,
    triggerOperation: TableActionEventEnum,
  ): Promise<void> {
    if (!tableActions.length) {
      return;
    }
    try {
      const queue = new PQueue({ concurrency: 2 });
      await Promise.all(
        tableActions.map((tableAction) =>
          queue
            .add(() =>
              this.activateTableAction(tableAction, connection, [request_body], userId, tableName, triggerOperation),
            )
            .catch((error) => {
              console.error('Error in activateTableActions', error);
            }),
        ),
      );
    } catch (_error) {
      return;
    }
  }

  private async getPrimaryKeysObjects(
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    tableName: string,
  ): Promise<Array<Record<string, unknown>>> {
    const dataAccessObject = getDataAccessObject(foundConnection);
    const tablePrimaryKeys = await dataAccessObject.getTablePrimaryColumns(tableName, null);
    const primaryKeyValuesArray: Array<Record<string, unknown>> = [];
    for (const primaryKeyInBody of request_body) {
      const pKeysObj: Record<string, unknown> = {};
      for (const primaryKey of tablePrimaryKeys) {
        if (primaryKeyInBody.hasOwnProperty(primaryKey.column_name) && primaryKeyInBody[primaryKey.column_name]) {
          pKeysObj[primaryKey.column_name] = primaryKeyInBody[primaryKey.column_name];
        }
      }
      if (Object.keys(pKeysObj).length) {
        primaryKeyValuesArray.push(pKeysObj);
      }
    }

    return primaryKeyValuesArray;
  }

  private generateMessageContent(
    userInfo: UserInfoMessageData,
    triggerOperation: TableActionEventEnum,
    tableName: string,
    primaryKeyValuesArray: Array<Record<string, unknown>>,
  ): MessageContent {
    const { email, userId, userName } = userInfo;
    const textContent = `User with id "${userId}", email "${email}", name "${userName}" ${
      triggerOperation === TableActionEventEnum.ADD_ROW
        ? 'added'
        : triggerOperation === TableActionEventEnum.UPDATE_ROW
          ? 'updated'
          : triggerOperation === TableActionEventEnum.DELETE_ROW
            ? 'deleted'
            : 'performed an action on'
    } a row in table "${tableName}" with primary keys: ${JSON.stringify(primaryKeyValuesArray)}`;

    const htmlContent = `<p>${textContent}</p>`;
    return {
      text: textContent,
      html: htmlContent,
    };
  }
}
