import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionsComponents } from './transactions.components';

describe('TransactionsComponents', () => {
  let component: TransactionsComponents;
  let fixture: ComponentFixture<TransactionsComponents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsComponents],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsComponents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
