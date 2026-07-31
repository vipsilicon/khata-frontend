export const API_CONFIG = {
  AUTH: {
    REGISTER: '/auth/register/user',
    LOGIN: '/auth/login/user',
    REFRESH_TOKEN: '/auth/refresh-token',
    RESET_PASSWORD: '/auth/reset-password/user',
  },
  BANK: {
    LIST: '/banks/list',
  },
  USER_BANK: {
    LIST: '/user-banks/list',
    CREATE: '/user-banks/create',
    TOTAL: '/user-banks/total',
  },
  PROFILE: {
    FETCH: '/users/profile',
    UPDATE: '/users/profile/update',
  },
  TRANSACTION: {
    LIST: '/transactions/list',
    DELETE: '/transactions/delete',
  },
  CASH_TRANSACTION: {
    LIST: '/cash-transaction/list',
    TOTAL: '/cash-transaction/total',
    UPDATE: '/cash-transaction/update',
    DELETE: '/cash-transaction/delete',
  },
  BANK_TRANSACTION: {
    LIST: '/bank-transaction/list',
    UPDATE: '/bank-transaction/update',
    DELETE: '/bank-transaction/delete',
  },
  INVESTMENT: {
    LIST: '/investments/list',
    UPDATE: '/investments/update',
    DELETE: '/investments/delete',
  },
  PAYEE: {
    PAYEE_CATEGORY_LIST: '/payee/category-list',
    LIST: '/payee/list',
    CREATE: '/payee/create',
    UPDATE: '/payee',
    DELETE: '/payee',
  },
};
