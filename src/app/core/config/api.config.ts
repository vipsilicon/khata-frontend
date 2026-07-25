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
  },
  CASH_TRANSACTION: {
    LIST: '/cash-transaction/list',
    TOTAL: '/cash-transaction/total',
  },
  BANK_TRANSACTION: {
    LIST: '/bank-transaction/list',
  },
  INVESTMENT: {
    LIST: '/investments/list',
  },
};
