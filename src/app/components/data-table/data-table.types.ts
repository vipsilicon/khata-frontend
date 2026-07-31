export type DataTableCellType = 'text' | 'date' | 'currency' | 'number' | 'badge' | 'actions';

export type DataTableAlign = 'left' | 'center' | 'right';

export type DataTableSortDir = 'asc' | 'desc';

export interface DataTableColumn<T = any> {
  /** Property key on each row object. Use any key for `actions` (e.g. `'actions'`). */
  key: string;
  label: string;
  type?: DataTableCellType;
  sortable?: boolean;
  align?: DataTableAlign;
  /** Angular date pipe format. Default: `dd MMM yyyy, hh:mm a` */
  dateFormat?: string;
  /** Angular number pipe digits. Default: `1.2-2` */
  numberFormat?: string;
  /** Shown when value is null/undefined/empty string */
  emptyValue?: string;
  /** Extra CSS classes for the cell */
  cellClass?: string;
  /** Badge color classes from cell value (and optional row) */
  badgeClass?: (value: unknown, row: T) => string;
}

export interface DataTableSortState {
  key: string;
  dir: DataTableSortDir;
}
