import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Job, JobCreateDto, Run } from './models';

/** Single typed HTTP boundary for the whole app - every call is typed and testable. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = 'http://localhost:8000/api';

  jobs$(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.baseUrl}/jobs`);
  }

  createJob$(dto: JobCreateDto): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${this.baseUrl}/jobs`, dto);
  }

  deleteJob$(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${id}`);
  }

  triggerRun$(jobId: number): Observable<{ run_id: number; status: string }> {
    return this.http.post<{ run_id: number; status: string }>(`${this.baseUrl}/jobs/${jobId}/runs`, {});
  }

  runs$(jobId?: number): Observable<Run[]> {
    const params = jobId ? `?job_id=${jobId}` : '';
    return this.http.get<Run[]>(`${this.baseUrl}/runs${params}`);
  }
}
