export type SortDir = 'asc' | 'desc';

const DEFAULT_NUMERIC_KEYS = new Set([
  'id',
  'amount',
  'quantity',
  'userBankId',
  'payeeId',
]);

const DEFAULT_DATE_KEYS = new Set([
  'transactionDateTime',
  'createdAt',
  'updatedAt',
]);

/**
 * Client-side sort for table rows (shared by banks/cash/transactions/investments).
 */
export function sortRows<T extends Record<string, any>>(
  list: T[],
  key: string,
  dir: SortDir,
  options?: {
    numericKeys?: Iterable<string>;
    dateKeys?: Iterable<string>;
  },
): T[] {
  const numericKeys = options?.numericKeys
    ? new Set(options.numericKeys)
    : DEFAULT_NUMERIC_KEYS;
  const dateKeys = options?.dateKeys ? new Set(options.dateKeys) : DEFAULT_DATE_KEYS;

  return [...list].sort((a, b) => {
    let av: string | number = a[key] ?? '';
    let bv: string | number = b[key] ?? '';

    if (numericKeys.has(key)) {
      av = Number(av);
      bv = Number(bv);
    } else if (dateKeys.has(key)) {
      av = new Date(String(av)).getTime();
      bv = new Date(String(bv)).getTime();
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }

    if (av < bv) {
      return dir === 'asc' ? -1 : 1;
    }
    if (av > bv) {
      return dir === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/** Toggle sort: same column flips direction; new column defaults to asc. */
export function nextSortState(
  currentKey: string,
  currentDir: SortDir,
  nextKey: string,
): { key: string; dir: SortDir } {
  if (currentKey === nextKey) {
    return { key: currentKey, dir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: nextKey, dir: 'asc' };
}

/** True when scroll container is near the bottom (infinite scroll). */
export function isNearBottom(el: HTMLElement, threshold = 80): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
}

/** CREDIT / DEBIT badge classes used across transaction tables. */
export function creditDebitBadgeClass(type: string): string {
  if (type === 'CREDIT') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (type === 'DEBIT') {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-gray-100 text-gray-700';
}
