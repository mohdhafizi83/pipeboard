import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { JobForm } from './job-form';
import { JobCreateDto } from '../api/models';

describe('JobForm', () => {
  let fixture: ComponentFixture<JobForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [JobForm, ReactiveFormsModule] }).compileComponents();
    fixture = TestBed.createComponent(JobForm);
    fixture.detectChanges();
  });

  const el = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;

  it('starts invalid and keeps the submit button disabled', () => {
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect((el('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits the form value and resets after a valid submit', () => {
    const emitted: JobCreateDto[] = [];
    fixture.componentInstance.created.subscribe((v) => emitted.push(v));
    const form = fixture.componentInstance.form;
    form.setValue({ name: 'orders-daily', source: 'mysql:orders', sink: 'pg:raw', schedule: 'daily' });
    fixture.detectChanges(); // let the [disabled] binding re-evaluate before clicking
    el('button').click();
    fixture.detectChanges();
    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('orders-daily');
    expect(form.controls['name'].value).toBe('');
  });

  it('rejects a one-character name', () => {
    fixture.componentInstance.form.controls['name'].setValue('x');
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });
});
