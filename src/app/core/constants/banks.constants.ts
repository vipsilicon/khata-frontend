export const BANKS_CONST = {
  TOASTER_MESSAGE: {
    INVALID_DATA: 'Please enter a valid data',
    TX: {
      REQUIRED_FIELD: 'Please fill in all required fields',
      LOAD_FAILED: 'Failed to load bank transactions',
      UPDATE_SUCCESS: 'Bank transaction updated successfully',
      UPDATE_FAILED: 'Failed to update bank transaction',
      DELETE_SUCCESS: 'Bank transaction deleted successfully',
      DELETE_FAILED: 'Failed to delete bank transaction',
    },
  },
  VALIDATION: {
    SELECT_BANK: 'Please select bank',
    NO_BANK_OPTION: 'There is no bank option for select',
    INITIAL_AMOUNT_REQ: 'Initial amount required',
    INITIAL_AMOUNT_LESS: 'Initial amount can not be less than zero',
    TX: {
      DATE_REQUIRED: 'Date & time is required',
      TYPE_REQUIRED: 'Type is required',
      AMOUNT_INVALID: 'Enter a valid amount',
    },
  },
  MODAL: {
    DELETE_BANK: 'Are you sure to delete bank?',
    DELETE_TX: 'Are you sure you want to delete this bank transaction?',
  },
};
