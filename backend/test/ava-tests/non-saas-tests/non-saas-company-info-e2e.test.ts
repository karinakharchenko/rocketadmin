/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { TestUtils } from '../../utils/test.utils.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication() as any;
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(validationErrors: ValidationError[] = []) {
        return new ValidationException(validationErrors);
      },
    }),
  );
  await app.init();
  app.getHttpServer().listen(0);
});

currentTest = 'GET /company/my';

test(`${currentTest} should return found company info for user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    t.is(foundCompanyInfo.status, 200);
    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 2);
  } catch (error) {
    console.error(error);
  }
});

currentTest = 'GET /company/my/full';

test(`${currentTest} should return full found company info for company admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
    // console.log(
    //   `🚀 ~ file: non-saas-company-info-e2e.test.ts:87 ~ test ~ foundCompanyInfoRO: \n\n
    // ${JSON.stringify(foundCompanyInfoRO)}
    // \n\n
    // `
    // );

    t.is(foundCompanyInfo.status, 200);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 4);
    t.is(foundCompanyInfoRO.hasOwnProperty('connections'), true);
    t.is(foundCompanyInfoRO.connections.length > 3, true);
    t.is(foundCompanyInfoRO.hasOwnProperty('invitations'), true);
    t.is(foundCompanyInfoRO.invitations.length, 0);
    t.is(Object.keys(foundCompanyInfoRO.connections[0]).length, 6);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('title'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('updatedAt'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('author'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('groups'), true);
    t.is(foundCompanyInfoRO.connections[0].groups.length > 0, true);
    t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0]).length, 4);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('title'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('isMain'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('users'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users.length > 0, true);
    t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0].users[0]).length, 7);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('email'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('role'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('password'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return found company info for non-admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 2);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /company/my/email';

test(`${currentTest} should return found company infos for admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get(`/company/my/email/${testData.users.adminUserEmail}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(Array.isArray(foundCompanyInfoRO), true);
    t.is(foundCompanyInfoRO.length, 1);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('id'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return found company infos for non-admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get(`/company/my/email/${testData.users.simpleUserEmail}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(Array.isArray(foundCompanyInfoRO), true);
    t.is(foundCompanyInfoRO.length, 1);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('id'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /company/remove';

test(`${currentTest} should remove user from company`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);

    const allGroupsInResult = foundCompanyInfoRO.connections.map((connection) => connection.groups).flat();
    const allUsersInResult = allGroupsInResult.map((group) => group.users).flat();
    const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail);

    t.is(foundSimpleUserInResult.email, simpleUserEmail);

    const removeUserFromCompanyResult = await request(app.getHttpServer())
      .put(`/company/user/remove/${foundCompanyInfoRO.id}`)
      .send({
        email: simpleUserEmail,
      })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const removeUserFromCompany = JSON.parse(removeUserFromCompanyResult.text);

    t.is(removeUserFromCompanyResult.status, 200);
    t.is(removeUserFromCompany.success, true);

    const foundCompanyInfoAfterUserDeletion = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoROAfterUserDeletion = JSON.parse(foundCompanyInfoAfterUserDeletion.text);

    const allGroupsInResultAfterUserDeletion = foundCompanyInfoROAfterUserDeletion.connections
      .map((connection) => connection.groups)
      .flat();
    const allUsersInResultAfterUserDeletion = allGroupsInResultAfterUserDeletion.map((group) => group.users).flat();
    const foundSimpleUserInResultAfterUserDeletion = !!allUsersInResultAfterUserDeletion.find(
      (user) => user.email === simpleUserEmail,
    );

    t.is(foundSimpleUserInResultAfterUserDeletion, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT invitation/revoke/:slug';

test(`${currentTest} should remove user invitation from company`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
    t.is(foundCompanyInfoRO.invitations.length, 0);

    const removeUserFromCompanyResult = await request(app.getHttpServer())
      .put(`/company/user/remove/${foundCompanyInfoRO.id}`)
      .send({
        email: simpleUserEmail,
      })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const invitationRequestBody = {
      companyId: foundCompanyInfoRO.id,
      email: simpleUserEmail,
      role: 'USER',
      groupId: foundCompanyInfoRO.connections[0].groups[0].id,
    };

    const invitationResult = await request(app.getHttpServer())
      .put(`/company/user/${foundCompanyInfoRO.id}`)
      .send(invitationRequestBody)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(invitationResult.status, 200);

    const foundCompanyInfoWithInvitation = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoWithInvitationRO = JSON.parse(foundCompanyInfoWithInvitation.text);
    t.is(foundCompanyInfoWithInvitationRO.invitations.length, 1);

    const deleteInvitationResult = await request(app.getHttpServer())
      .put(`/company/invitation/revoke/${foundCompanyInfoRO.id}`)
      .send({
        email: simpleUserEmail,
      })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    t.is(deleteInvitationResult.status, 200);

    const foundCompanyInfoAfterInvitationDeletion = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoROAfterInvitationDeletion = JSON.parse(foundCompanyInfoAfterInvitationDeletion.text);
    t.is(foundCompanyInfoROAfterInvitationDeletion.invitations.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT company/name/:slug';

test(`${currentTest} should update company name`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
  } = testData;

  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
  t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);

  const newName = `${faker.company.name()}_${nanoid(5)}`;

  const updateCompanyNameResult = await request(app.getHttpServer())
    .put(`/company/name/${foundCompanyInfoRO.id}`)
    .send({
      name: newName,
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');
  t.is(updateCompanyNameResult.status, 200);

  const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoROAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
  t.is(foundCompanyInfoROAfterUpdate.hasOwnProperty('name'), true);
  t.is(foundCompanyInfoROAfterUpdate.name, newName);
});
