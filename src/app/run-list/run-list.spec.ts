import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RunList } from './run-list';
import { Run } from '../api/models';

const runs: Run[] = [
  { id: 1, job_id: 1, job_name: 'orders-daily', status: 'success', started_at: '2026-11-20T10:00:00', finished_at: '2026-11-20T10:00:04', rows_moved: 120, log: 'ok' },
  { id: 2, job_id: 2, job_name: 'users-sync', status: 'failed', started_at: '2026-11-20T10:01:00', finished_at: '2026-11-20T10:01:02', rows_moved: 0, log: 'boom' },
];

describe('RunList', () => {
  let fixture: ComponentFixture<RunList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RunList] }).compileComponents();
    fixture = TestBed.createComponent(RunList);
    fixture.componentRef.setInput('runs', runs);
    fixture.detectChanges();
  });

  it('renders one entry per run with a status badge', () => {
    const badges = fixture.nativeElement.querySelectorAll('.badge');
    expect(badges.length).toBe(2);
    expect(badges[0].classList).toContain('badge-success');
    expect(badges[1].classList).toContain('badge-failed');
  });

  it('shows rows moved only for successful runs', () => {
    const rows = fixture.nativeElement.querySelectorAll('.rows');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('120');
  });
});
