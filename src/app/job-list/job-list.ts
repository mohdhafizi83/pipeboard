import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Job } from '../api/models';

@Component({
  selector: 'app-job-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <section class="jobs">
      <h2>Pipelines <span class="count">({{ jobs().length }})</span></h2>
      @if (jobs().length === 0) {
        <p class="empty">No jobs yet - register one on the left.</p>
      } @else {
        <table>
          <thead>
            <tr><th>Name</th><th>Source &rarr; Sink</th><th>Schedule</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            @for (job of jobs(); track job.id) {
              <tr>
                <td class="name">{{ job.name }}</td>
                <td class="flow">{{ job.source }} &rarr; {{ job.sink }}</td>
                <td>{{ job.schedule }}</td>
                <td>{{ job.created_at | date: 'dd MMM, HH:mm' }}</td>
                <td class="actions">
                  <button (click)="run.emit(job.id)" title="Run now">&#9654;</button>
                  <button class="danger" (click)="remove.emit(job.id)" title="Delete">&times;</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [`
    .jobs h2 { font-size: 1.05rem; margin: 0 0 .5rem; }
    .count { color: #64748b; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    th { text-align: left; color: #64748b; font-weight: 600; padding: .35rem .5rem; border-bottom: 1px solid #e2e8f0; }
    td { padding: .45rem .5rem; border-bottom: 1px solid #f1f5f9; }
    .name { font-weight: 600; }
    .flow { font-family: ui-monospace, monospace; font-size: .78rem; color: #334155; }
    .actions { text-align: right; white-space: nowrap; }
    .actions button { border: 1px solid #cbd5e1; background: #fff; border-radius: 6px;
      margin-left: .3rem; cursor: pointer; padding: .15rem .5rem; }
    .actions button.danger { color: #b91c1c; }
    .empty { color: #64748b; font-size: .9rem; }
  `],
})
export class JobList {
  readonly jobs = input.required<Job[]>();
  readonly run = output<number>();
  readonly remove = output<number>();
}
