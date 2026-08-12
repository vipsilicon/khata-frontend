import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LucideAngularModule,
  SquarePen,
  Trash2,
} from 'lucide-angular';

import { DataTableColumn, DataTableSortDir } from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
})
export class DataTableComponent {
  readonly arrowUp = ArrowUp;
  readonly arrowDown = ArrowDown;
  readonly arrowUpDown = ArrowUpDown;
  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;
  readonly squarePen = SquarePen;
  readonly trash = Trash2;

  /** Column definitions (order = display order). */
  @Input({ required: true }) columns: DataTableColumn[] = [];

  /** Row data objects. */
  @Input() rows: Record<string, any>[] = [];

  /** Property used for `@for` track. Default `id`. */
  @Input() trackByKey = 'id';

  @Input() loading = false;
  @Input() loadingMore = false;
  /** When true and not loading more, footer shows "all loaded" if rows exist. */
  @Input() hasMore = false;
  /** Enable infinite-scroll container + scroll event. */
  @Input() infiniteScroll = false;

  /** Server-side pagination (page / limit query params on parent). */
  @Input() showPagination = false;
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;

  @Input() loadingText = 'Loading…';
  @Input() emptyText = 'No records found';
  @Input() loadingMoreText = 'Loading more…';
  @Input() allLoadedText = 'All records loaded';
  @Input() maxHeightClass = 'max-h-[calc(100vh-12rem)]';

  /** Current sort column key (for sort icon). */
  @Input() sortKey: string | null = null;
  @Input() sortDir: DataTableSortDir = 'asc';

  @Input() showEdit = true;
  @Input() showDelete = true;

  @Output() sortChange = new EventEmitter<string>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() scrolled = new EventEmitter<Event>();
  /** Emits the requested page number (1-based). */
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    if (this.total <= 0 || this.limit <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get fromRecord(): number {
    if (this.total <= 0) {
      return 0;
    }
    return (this.page - 1) * this.limit + 1;
  }

  get toRecord(): number {
    if (this.total <= 0) {
      return 0;
    }
    return Math.min(this.page * this.limit, this.total);
  }

  get canGoPrev(): boolean {
    return this.page > 1 && !this.loading;
  }

  get canGoNext(): boolean {
    return this.page < this.totalPages && !this.loading;
  }

  /** Compact page list with ellipsis for large totals. */
  get pageNumbers(): (number | '…')[] {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p >= 1 && p <= total) {
        pages.add(p);
      }
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: (number | '…')[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) {
        result.push('…');
      }
      result.push(p);
      prev = p;
    }
    return result;
  }

  onHeaderClick(col: DataTableColumn): void {
    if (!col.sortable) {
      return;
    }
    this.sortChange.emit(col.key);
  }

  sortIcon(key: string) {
    if (this.sortKey !== key) {
      return this.arrowUpDown;
    }
    return this.sortDir === 'asc' ? this.arrowUp : this.arrowDown;
  }

  cellValue(row: Record<string, any>, key: string): any {
    return row?.[key];
  }

  isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '';
  }

  alignClass(align?: string): string {
    if (align === 'center') {
      return 'text-center';
    }
    if (align === 'right') {
      return 'text-right';
    }
    return 'text-left';
  }

  onScroll(event: Event): void {
    if (!this.infiniteScroll) {
      return;
    }
    this.scrolled.emit(event);
  }

  goToPage(page: number): void {
    if (this.loading || page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.pageChange.emit(page);
  }

  prevPage(): void {
    if (this.canGoPrev) {
      this.goToPage(this.page - 1);
    }
  }

  nextPage(): void {
    if (this.canGoNext) {
      this.goToPage(this.page + 1);
    }
  }

  onEdit(row: Record<string, any>, event: Event): void {
    event.stopPropagation();
    this.edit.emit(row);
  }

  onDelete(row: Record<string, any>, event: Event): void {
    event.stopPropagation();
    this.delete.emit(row);
  }

  trackRow(row: Record<string, any>): unknown {
    return row?.[this.trackByKey] ?? row;
  }
}
