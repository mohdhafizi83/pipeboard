import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { JobCreateDto } from '../api/models';

@Component({
  selector: 'app-job-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="job-form">
      <h2>Register pipeline</h2>
      <label>Name
        <input formControlName="name" placeholder="orders-daily" />
      </label>
      <label>Source
        <input formControlName="source" placeholder="mysql:orders" />
      </label>
      <label>Sink
        <input formControlName="sink" placeholder="snowflake:raw.orders" />
      </label>
      <label>Schedule
        <select formControlName="schedule">
          @for (s of schedules; track s) { <option [value]="s">{{ s }}</option> }
        </select>
      </label>
      <button type="submit" [disabled]="form.invalid">Add job</button>
      @if (form.touched && form.invalid) {
        <p class="hint">All fields are required (name needs 2+ characters).</p>
      }
    </form>
  `,
  styles: [`
    .job-form { display: grid; gap: .6rem; }
    .job-form h2 { margin: 0 0 .2rem; font-size: 1.05rem; }
    .job-form label { display: grid; gap: .2rem; font-size: .85rem; }
    .job-form input, .job-form select { padding: .45rem .55rem; border: 1px solid #cbd5e1; border-radius: 6px; }
    .job-form button { justify-self: start; padding: .45rem 1rem; border: 0; border-radius: 6px;
      background: #1f3864; color: #fff; cursor: pointer; }
    .job-form button:disabled { opacity: .45; cursor: not-allowed; }
    .hint { color: #b45309; font-size: .8rem; margin: 0; }
  `],
})
export class JobForm {
  private readonly fb = inject(FormBuilder);
  readonly created = output<JobCreateDto>();
  readonly schedules = ['manual', 'hourly', 'daily', 'nightly', 'weekly'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    source: ['', Validators.required],
    sink: ['', Validators.required],
    schedule: ['manual', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.created.emit(this.form.getRawValue() as JobCreateDto);
    this.form.reset({ name: '', source: '', sink: '', schedule: 'manual' });
  }
}
