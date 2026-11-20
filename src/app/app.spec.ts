import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let httpMock: HttpTestingController;

  const job = { id: 1, name: 'orders-daily', source: 'mysql:orders', sink: 'pg:raw', schedule: 'daily', enabled: 1, created_at: '2026-11-20T10:00:00' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App, HttpClientTestingModule] }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function boot(failJobs = false): ComponentFixture<App> {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const jobsReq = httpMock.expectOne('http://localhost:8000/api/jobs');
    const runsReq = httpMock.expectOne('http://localhost:8000/api/runs');
    if (failJobs) {
      jobsReq.error(new ProgressEvent('network error'));
    } else {
      jobsReq.flush([job]);
    }
    runsReq.flush([]);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the header and loads jobs into the table', () => {
    const el = boot().nativeElement;
    expect(el.querySelector('h1')!.textContent).toContain('PipeBoard');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('shows the offline banner when the API is unreachable', () => {
    const el = boot(true).nativeElement;
    expect(el.querySelector('.offline')).toBeTruthy();
  });
});
