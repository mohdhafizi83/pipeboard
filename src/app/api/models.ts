export interface Job {
  id: number;
  name: string;
  source: string;
  sink: string;
  schedule: string;
  enabled: number;
  created_at: string;
}

export interface Run {
  id: number;
  job_id: number;
  job_name: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  started_at: string | null;
  finished_at: string | null;
  rows_moved: number;
  log: string;
}

export interface JobCreateDto {
  name: string;
  source: string;
  sink: string;
  schedule: string;
}
