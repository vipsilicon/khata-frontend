import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayeeComponent } from './payee.component';

describe('PayeeComponent', () => {
  let component: PayeeComponent;
  let fixture: ComponentFixture<PayeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayeeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayeeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
