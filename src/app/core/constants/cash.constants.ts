export const CASH_CONST = {
  TOASTER_MESSAGE: {
    REQUIRED_FIELD: 'Please fill in all required fields',
    LOAD: {
      FAILED: 'Failed to load cash transactions',
    },
    CREATE: {
      SUCCESS: 'Cash transaction added successfully',
      FAILED: 'Failed to add cash transaction',
    },
    UPDATE: {
      SUCCESS: 'Cash transaction updated successfully',
      FAILED: 'Failed to update cash transaction',
    },
    DELETE: {
      SUCCESS: 'Cash transaction deleted successfully',
      FAILED: 'Failed to delete cash transaction',
    },
  },
  VALIDATION: {
    DATE_REQUIRED: 'Date & time is required',
    TYPE_REQUIRED: 'Type is required',
    PURPOSE_REQUIRED: 'Purpose is required',
    CATEGORY_REQUIRED: 'Please select a category',
    SUB_CATEGORY_REQUIRED: 'Please select a sub category',
    PAYEE_REQUIRED: 'Please select a payee',
    AMOUNT_INVALID: 'Enter a valid amount (min 0.01)',
  },
  MODAL: {
    DELETE: 'Are you sure you want to delete this cash transaction?',
  },
};
