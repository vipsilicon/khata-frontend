import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToasterMessageComponent } from './toaster-message.component';

describe('ToasterMessageComponent', () => {
  let component: ToasterMessageComponent;
  let fixture: ComponentFixture<ToasterMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToasterMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToasterMessageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
