import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { Job } from './models';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const job: Job = {
    id: 1, name: 'orders-daily', source: 'mysql:orders', sink: 'pg:raw.orders',
    schedule: 'daily', enabled: 1, created_at: '2026-11-20T10:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the job list from /api/jobs', () => {
    let result: Job[] | undefined;
    service.jobs$().subscribe((j) => (result = j));
    const req = httpMock.expectOne('http://localhost:8000/api/jobs');
    expect(req.request.method).toBe('GET');
    req.flush([job]);
    expect(result).toEqual([job]);
  });

  it('POSTs the create payload untouched', () => {
    const dto = { name: 'a', source: 's', sink: 'k', schedule: 'manual' };
    service.createJob$(dto).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/jobs');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 2, name: 'a' });
  });

  it('scopes runs$ by job_id when given', () => {
    let called = false;
    service.runs$(7).subscribe(() => (called = true));
    const req = httpMock.expectOne('http://localhost:8000/api/runs?job_id=7');
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(called).toBe(true);
  });

  it('deletes a job by id', () => {
    service.deleteJob$(3).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/jobs/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
