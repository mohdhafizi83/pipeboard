import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobList } from './job-list';
import { Job } from '../api/models';

const jobs: Job[] = [
  { id: 1, name: 'orders-daily', source: 'mysql:orders', sink: 'pg:raw', schedule: 'daily', enabled: 1, created_at: '2026-11-20T10:00:00' },
  { id: 2, name: 'users-sync', source: 'api:users', sink: 'pg:raw.users', schedule: 'hourly', enabled: 1, created_at: '2026-11-20T11:00:00' },
];

describe('JobList', () => {
  let fixture: ComponentFixture<JobList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [JobList] }).compileComponents();
    fixture = TestBed.createComponent(JobList);
    fixture.componentRef.setInput('jobs', jobs);
    fixture.detectChanges();
  });

  it('renders one row per job', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows the empty hint when there are no jobs', () => {
    fixture.componentRef.setInput('jobs', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty')).toBeTruthy();
  });

  it('emits the job id on run and remove clicks', () => {
    const runs: number[] = [];
    const removes: number[] = [];
    fixture.componentInstance.run.subscribe((id) => runs.push(id));
    fixture.componentInstance.remove.subscribe((id) => removes.push(id));
    const buttons = fixture.nativeElement.querySelectorAll('.actions button');
    buttons[0].click();
    buttons[3].click();
    expect(runs).toEqual([1]);
    expect(removes).toEqual([2]);
  });
});
