export const PAYEE_CONST = {
  VALIDATION: {
    NAME_NOT_EMPTY: 'Name should not be empty',
    SELECT_PAYEE_CATEGORY: 'Please select payee category',
  },
  MODAL: {
    DELETE_PAYEE: 'Are you sure you want to delete this payee?',
  },
  TOASTER_MESSAGE: {
    REQUIRED_FIELD: 'Please fill in all required fields',
    CREATE: {
      SUCCESS: 'Payee added successfully',
      FAILED: 'Failed to add payee',
      MISSING_ID: 'Payee created but response is missing id',
    },
    UPDATE: {
      SUCCESS: 'Payee updated successfully',
      FAILED: 'Failed to update payee',
    },
    DELETE: {
      SUCCESS: 'Payee deleted successfully',
      FAILED: 'Failed to delete payee',
    },
    LOAD: {
      FAILED: 'Failed to load payees',
      CATEGORY_FAILED: 'Failed to load payee categories',
    },
  },
};
