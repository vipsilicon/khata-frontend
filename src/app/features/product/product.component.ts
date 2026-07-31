import { NgClass } from '@angular/common';
import { Component, signal } from '@angular/core';

interface IItems {
  id: number;
  name: string;
}

@Component({
  selector: 'app-product',
  imports: [NgClass],
  standalone: true,
  templateUrl: './product.component.html',
  styleUrl: './product.component.css',
})
export class ProductComponent {
  items = signal<IItems[]>([
    {
      id: 1,
      name: 'Name 1',
    },
    {
      id: 2,
      name: 'Name 2',
    },
    {
      id: 3,
      name: 'Name 3',
    },
  ]);

  selectedTab = signal<number | null>(null);

  selectProductTab(item: IItems): void {
    if (this.selectedTab() === item.id) {
      return;
    }

    this.selectedTab.set(item.id);
  }
}
