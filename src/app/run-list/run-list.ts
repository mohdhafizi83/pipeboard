import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Run } from '../api/models';

@Component({
  selector: 'app-run-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <section class="runs">
      <h2>Run history</h2>
      @if (runs().length === 0) {
        <p class="empty">No runs yet - trigger one with &#9654;.</p>
      } @else {
        <ul>
          @for (run of runs(); track run.id) {
            <li class="run">
              <span class="badge" [class]="'badge badge-' + run.status">{{ run.status }}</span>
              <span class="job">{{ run.job_name }}</span>
              @if (run.status === 'success') { <span class="rows">{{ run.rows_moved }} rows</span> }
              <span class="when">{{ (run.finished_at ?? run.started_at) | date: 'HH:mm:ss' }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    .runs h2 { font-size: 1.05rem; margin: 0 0 .5rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
    .run { display: flex; align-items: center; gap: .6rem; font-size: .85rem;
      padding: .4rem .55rem; background: #f8fafc; border-radius: 6px; }
    .job { font-weight: 600; flex: 1; }
    .rows { color: #166534; font-size: .78rem; }
    .when { color: #64748b; font-size: .75rem; }
    .badge { padding: .1rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 700;
      text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-failed { background: #fee2e2; color: #b91c1c; }
    .badge-queued { background: #e2e8f0; color: #475569; }
    .badge-running { background: #dbeafe; color: #1d4ed8; }
    .empty { color: #64748b; font-size: .9rem; }
  `],
})
export class RunList {
  readonly runs = input.required<Run[]>();
}
