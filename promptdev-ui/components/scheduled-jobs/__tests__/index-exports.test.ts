import { describe, it, expect } from 'vitest'

// Import each export individually to trigger barrel file coverage
import {
  JOB_TYPE_CONFIG,
  CRON_PRESETS,
  STATUS_VARIANT,
  describeCron,
  CreateJobDialog,
  JobCard,
} from '@/components/scheduled-jobs/index'

describe('scheduled-jobs barrel exports', () => {
  it('exports JOB_TYPE_CONFIG', () => {
    expect(JOB_TYPE_CONFIG).toBeDefined()
    expect(typeof JOB_TYPE_CONFIG).toBe('object')
  })

  it('exports CRON_PRESETS', () => {
    expect(CRON_PRESETS).toBeDefined()
  })

  it('exports STATUS_VARIANT', () => {
    expect(STATUS_VARIANT).toBeDefined()
    expect(typeof STATUS_VARIANT).toBe('object')
  })

  it('exports describeCron function', () => {
    expect(describeCron).toBeDefined()
    expect(typeof describeCron).toBe('function')
  })

  it('exports CreateJobDialog component', () => {
    expect(CreateJobDialog).toBeDefined()
    expect(typeof CreateJobDialog).toBe('function')
  })

  it('exports JobCard component', () => {
    expect(JobCard).toBeDefined()
    expect(typeof JobCard).toBe('function')
  })
})
