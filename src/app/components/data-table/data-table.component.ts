import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
