export const TRANSACTIONS_CONST = {
  TOASTER_MESSAGE: {
    REQUIRED_FIELD: 'Please fill in all required fields',
    LOAD: {
      FAILED: 'Failed to load transactions',
    },
    CREATE: {
      SUCCESS: 'Transaction added successfully',
      FAILED: 'Failed to add transaction',
    },
    UPDATE: {
      SUCCESS: 'Transaction updated successfully',
      FAILED: 'Failed to update transaction',
    },
    DELETE: {
      SUCCESS: 'Transaction deleted successfully',
      FAILED: 'Failed to delete transaction',
    },
  },
  VALIDATION: {
    DATE_REQUIRED: 'Date & time is required',
    TYPE_REQUIRED: 'Type is required',
    PAYMENT_MODE_REQUIRED: 'Payment mode is required',
    PURPOSE_REQUIRED: 'Purpose is required',
    CATEGORY_REQUIRED: 'Please select a category',
    SUB_CATEGORY_REQUIRED: 'Please select a sub category',
    PAYEE_REQUIRED: 'Please select a payee',
    BANK_REQUIRED: 'Please select a bank account',
    AMOUNT_INVALID: 'Enter a valid amount (min 0.01)',
    INVESTMENT_TYPE_REQUIRED: 'Investment type is required',
    INVESTMENT_NAME_REQUIRED: 'Investment name is required',
    QUANTITY_INVALID: 'Enter a valid quantity',
  },
  MODAL: {
    DELETE: 'Are you sure you want to delete this transaction?',
  },
};
