// Before & After cleaning jobs — the one list the technician app, the API and the site visit
// email all read, so a job's name is spelt the same everywhere.

export const CLEANING_JOBS = [
  { value: 'pool_floor', label: 'Pool floor' },
  { value: 'scum_line', label: 'Scum line' },
  { value: 'plant_room', label: 'Plant room tidy-up' },
  { value: 'pool_deck', label: 'Pool deck' },
  { value: 'other', label: 'Other' },
] as const

export type CleaningJobType = typeof CLEANING_JOBS[number]['value']

export const MAX_CLEANING_PHOTOS = 3   // per side: up to 3 before and 3 after

export function isCleaningJobType(v: unknown): v is CleaningJobType {
  return CLEANING_JOBS.some(j => j.value === v)
}

/** What the job is called: the typed name for "other", the list name for everything else. */
export function cleaningJobName(job: { job_type: string; job_label?: string | null }): string {
  if (job.job_type === 'other' && job.job_label) return job.job_label
  return CLEANING_JOBS.find(j => j.value === job.job_type)?.label ?? job.job_type
}
