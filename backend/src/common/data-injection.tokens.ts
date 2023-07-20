export enum BaseType {
  GLOBAL_DB_CONTEXT = 'GLOBAL_DB_CONTEXT',
  DATA_SOURCE = 'DATA_SOURCE',
  REPO_ACCESSOR = 'REPO_ACCESSOR',
}

export enum UseCaseType {
  CREATE_USER = 'CREATE_USER',
  DELETE_USER_ACCOUNT = 'DELETE_USER_ACCOUNT',
  FIND_USER = 'FIND_USER',
  UPGRADE_USER_SUBSCRIPTION = 'UPGRADE_USER_SUBSCRIPTION',
  USUAL_LOGIN = 'USUAL_LOGIN',
  USUAL_REGISTER = 'USUAL_REGISTER',
  LOG_OUT = 'LOG_OUT',
  GOOGLE_LOGIN = 'GOOGLE_LOGIN',
  FACEBOOK_LOGIN = 'FACEBOOK_LOGIN',
  CHANGE_USUAL_PASSWORD = 'CHANGE_USUAL_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_RESET_USER_PASSWORD = 'VERIFY_RESET_USER_PASSWORD',
  REQUEST_RESET_USER_PASSWORD = 'REQUEST_RESET_USER_PASSWORD',
  REQUEST_CHANGE_USER_EMAIL = 'REQUEST_CHANGE_USER_EMAIL',
  VERIFY_EMAIL_CHANGE = 'VERIFY_EMAIL_CHANGE',
  VERIFY_EMAIL_REQUEST = 'VERIFY_EMAIL_REQUEST',
  CHANGE_USER_NAME = 'CHANGE_USER_NAME',
  GENERATE_OTP = 'GENERATE_OTP',
  VERIFY_OTP = 'VERIFY_OTP',
  OTP_LOGIN = 'OTP_LOGIN',
  DISABLE_OTP = 'DISABLE_OTP',
  GET_GITHUB_LOGIN_LINK = 'GET_GITHUB_LOGIN_LINK',
  AUTHENTICATE_WITH_GITHUB = 'AUTHENTICATE_WITH_GITHUB',
  GET_STRIPE_INTENT_ID = 'GET_STRIPE_INTENT_ID',
  ADD_STRIPE_SETUP_INTENT_TO_CUSTOMER = 'ADD_STRIPE_SETUP_INTENT_TO_CUSTOMER',

  FIND_CONNECTIONS = 'FIND_CONNECTIONS',
  FIND_USERS_IN_CONNECTION = 'FIND_USERS_IN_CONNECTION',
  FIND_CONNECTION = 'FIND_CONNECTION',
  CREATE_CONNECTION = 'CREATE_CONNECTION',
  UPDATE_CONNECTION = 'UPDATE_CONNECTION',
  DELETE_CONNECTION = 'DELETE_CONNECTION',
  DELETE_GROUP_FROM_CONNECTION = 'DELETE_GROUP_FROM_CONNECTION',
  CREATE_GROUP_IN_CONNECTION = 'CREATE_GROUP_IN_CONNECTION',
  GET_USER_GROUPS_IN_CONNECTION = 'GET_USER_GROUPS_IN_CONNECTION',
  GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION = 'GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION',
  GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION = 'GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION',
  TEST_CONNECTION_USE_CASE = 'TEST_CONNECTION_USE_CASE',
  UPDATE_CONNECTION_MASTER_PASSWORD = 'UPDATE_CONNECTION_MASTER_PASSWORD',
  RESTORE_CONNECTION = 'RESTORE_CONNECTION',
  VALIDATE_CONNECTION_TOKEN = 'VALIDATE_CONNECTION_TOKEN',
  REFRESH_CONNECTION_AGENT_TOKEN = 'REFRESH_CONNECTION_AGENT_TOKEN',

  FIND_ALL_USER_GROUPS = 'FIND_ALL_USER_GROUPS',
  INVITE_USER_IN_GROUP = 'INVITE_USER_IN_GROUP',
  VERIFY_INVITE_USER_IN_GROUP = 'VERIFY_INVITE_USER_IN_GROUP',
  FIND_ALL_USERS_IN_GROUP = 'FIND_ALL_USERS_IN_GROUP',
  REMOVE_USER_FROM_GROUP = 'REMOVE_USER_FROM_GROUP',
  DELETE_GROUP = 'DELETE_GROUP',

  FIND_CONNECTION_PROPERTIES = 'FIND_CONNECTION_PROPERTIES',
  CREATE_CONNECTION_PROPERTIES = 'CREATE_CONNECTION_PROPERTIES',
  UPDATE_CONNECTION_PROPERTIES = 'UPDATE_CONNECTION_PROPERTIES',
  DELETE_CONNECTION_PROPERTIES = 'DELETE_CONNECTION_PROPERTIES',

  GET_CONVERSIONS = 'GET_CONVERSIONS',

  GET_CUSTOM_FIELDS = 'GET_CUSTOM_FIELDS',
  CREATE_CUSTOM_FIELDS = 'CREATE_CUSTOM_FIELDS',
  UPDATE_CUSTOM_FIELDS = 'UPDATE_CUSTOM_FIELDS',
  DELETE_CUSTOM_FIELD = 'DELETE_CUSTOM_FIELD',

  CREATE_OR_UPDATE_PERMISSIONS = 'CREATE_OR_UPDATE_PERMISSIONS',

  FIND_LOGS = 'FIND_LOGS',

  FIND_TABLE_SETTINGS = 'FIND_TABLE_SETTINGS',
  CREATE_TABLE_SETTINGS = 'CREATE_TABLE_SETTINGS',
  UPDATE_TABLE_SETTINGS = 'UPDATE_TABLE_SETTINGS',
  DELETE_TABLE_SETTINGS = 'DELETE_TABLE_SETTINGS',

  GET_HELLO = 'GET_HELLO',

  CREATE_USER_ACTION = 'CREATE_USER_ACTION',

  CHECK_USER_LOGS_AND_UPDATE_ACTIONS = 'CHECK_USER_LOGS_AND_UPDATE_ACTIONS',
  CHECK_USER_ACTIONS_AND_MAIL_USERS = 'CHECK_USER_ACTIONS_AND_MAIL_USERS',

  FIND_TABLE_WIDGETS = 'FIND_TABLE_WIDGETS',
  CREATE_UPDATE_DELETE_TABLE_WIDGETS = 'CREATE_UPDATE_DELETE_TABLE_WIDGETS',

  FIND_TABLES_IN_CONNECTION = 'FIND_TABLES_IN_CONNECTION',
  GET_ALL_TABLE_ROWS = 'GET_ALL_TABLE_ROWS',
  GET_TABLE_STRUCTURE = 'GET_TABLE_STRUCTURE',
  ADD_ROW_IN_TABLE = 'ADD_ROW_IN_TABLE',
  UPDATE_ROW_IN_TABLE = 'UPDATE_ROW_IN_TABLE',
  DELETE_ROW_FROM_TABLE = 'DELETE_ROW_FROM_TABLE',
  DELETE_ROWS_FROM_TABLE = 'DELETE_ROWS_FROM_TABLE',
  GET_ROW_BY_PRIMARY_KEY = 'GET_ROW_BY_PRIMARY_KEY',

  CREATE_TABLE_ACTION = 'CREATE_TABLE_ACTION',
  FIND_TABLE_ACTIONS = 'FIND_TABLE_ACTIONS',
  ACTIVATE_TABLE_ACTION = 'ACTIVATE_TABLE_ACTION',
  ACTIVATE_TABLE_ACTIONS = 'ACTIVATE_TABLE_ACTIONS',
  UPDATE_TABLE_ACTION = 'UPDATE_TABLE_ACTION',
  DELETE_TABLE_ACTION = 'DELETE_TABLE_ACTION',
  FIND_TABLE_ACTION = 'FIND_TABLE_ACTION',

  STRIPE_WEBHOOK = 'STRIPE_WEBHOOK',
}

export enum DynamicModuleEnum {
  STRIPE_SERVICE = 'STRIPE_SERVICE',
}
