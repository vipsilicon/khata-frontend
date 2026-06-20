import { TestBed } from '@angular/core/testing';

import { ToasterMessageUtils } from './toaster-message.utils';

describe('ToasterMessageUtils', () => {
  let service: ToasterMessageUtils;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToasterMessageUtils);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
