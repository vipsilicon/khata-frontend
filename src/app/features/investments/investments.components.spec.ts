import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestmentsComponents } from './investments.components';

describe('InvestmentsComponents', () => {
  let component: InvestmentsComponents;
  let fixture: ComponentFixture<InvestmentsComponents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestmentsComponents],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentsComponents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
