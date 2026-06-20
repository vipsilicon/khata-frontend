import { TestBed } from '@angular/core/testing';

import { AuthStorageServices } from './auth-storage.services';

describe('AuthStorageServices', () => {
  let service: AuthStorageServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStorageServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
