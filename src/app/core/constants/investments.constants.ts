export const INVESTMENTS_CONST = {
  TOASTER_MESSAGE: {
    REQUIRED_FIELD: 'Please fill in all required fields',
    LOAD: {
      FAILED: 'Failed to load investments',
    },
    CREATE: {
      SUCCESS: 'Investment added successfully',
      FAILED: 'Failed to add investment',
    },
    UPDATE: {
      SUCCESS: 'Investment updated successfully',
      FAILED: 'Failed to update investment',
    },
    DELETE: {
      SUCCESS: 'Investment deleted successfully',
      FAILED: 'Failed to delete investment',
    },
  },
  VALIDATION: {
    DATE_REQUIRED: 'Date & time is required',
    TYPE_REQUIRED: 'Investment type is required',
    NAME_REQUIRED: 'Investment name is required',
    PAYMENT_MODE_REQUIRED: 'Please select payment mode',
    BANK_REQUIRED: 'Please select a bank for bank payment',
    PAYEE_REQUIRED: 'Please select a payee',
    CATEGORY_REQUIRED: 'Please select a category',
    SUB_CATEGORY_REQUIRED: 'Please select a sub category',
    QUANTITY_INVALID: 'Enter a valid quantity (min 0.0001)',
    AMOUNT_INVALID: 'Enter a valid amount (min 0.01)',
  },
  MODAL: {
    DELETE: 'Are you sure you want to delete this investment?',
  },
};
