import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';
import { ApiService } from './api/api.service';
import { Job, JobCreateDto, Run } from './api/models';
import { JobForm } from './job-form/job-form';
import { JobList } from './job-list/job-list';
import { RunList } from './run-list/run-list';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobForm, JobList, RunList],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(ApiService);

  protected readonly jobs = signal<Job[]>([]);
  protected readonly runs = signal<Run[]>([]);
  protected readonly offline = signal(false);
  protected readonly title = 'PipeBoard';

  constructor() {
    // one poll drives both lists; a failed poll flips the offline banner
    interval(5000)
      .pipe(startWith(0), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.refresh());
  }

  protected refresh(): void {
    this.api.jobs$().subscribe({
      next: (jobs) => { this.jobs.set(jobs); this.offline.set(false); },
      error: () => this.offline.set(true),
    });
    this.api.runs$().subscribe({ next: (runs) => this.runs.set(runs.slice(0, 25)) });
  }

  protected onCreate(dto: JobCreateDto): void {
    this.api.createJob$(dto).subscribe({ complete: () => this.refresh() });
  }

  protected onRun(jobId: number): void {
    this.api.triggerRun$(jobId).subscribe({ complete: () => this.refresh() });
  }

  protected onRemove(jobId: number): void {
    this.api.deleteJob$(jobId).subscribe({ complete: () => this.refresh() });
  }
}
